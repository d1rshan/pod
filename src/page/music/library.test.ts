import { describe, expect, test } from 'bun:test'
import { fetchAll, getPlaylists, getPlaylistTracks, nextParams, toPlaylist, toTrack } from './library'
import type { ApiParams, ApiResponse, MusicKitInstance } from './musickit'

/** fake MusicKit whose api.music answers from `respond` and records each call */
function fakeMk(respond: (path: string, params?: ApiParams) => ApiResponse) {
  const calls: [string, ApiParams | undefined][] = []
  const mk = {
    isAuthorized: true,
    playbackState: 0,
    currentPlaybackTime: 0,
    currentPlaybackDuration: 0,
    authorize: async () => {},
    setQueue: async () => {},
    play: async () => {},
    pause() {},
    addEventListener() {},
    removeEventListener() {},
    queue: { items: [], position: 0 },
    changeToMediaAtIndex: async () => {},
    api: {
      music: async (path: string, params?: ApiParams) => {
        calls.push([path, params])
        return respond(path, params)
      }
    }
  } satisfies MusicKitInstance
  return { mk, calls }
}

const song = (id: string) => ({
  id,
  type: 'library-songs',
  attributes: {
    name: `Song ${id}`,
    artistName: 'Artist',
    albumName: 'Album',
    durationInMillis: 1000,
    artwork: { url: 'https://x/{w}x{h}bb.jpg' }
  }
})

describe('toPlaylist', () => {
  test('maps name and artwork, with fallbacks', () => {
    expect(toPlaylist({ id: 'p.1', attributes: { name: 'Chill', artwork: { url: 'u' } } })).toEqual({
      id: 'p.1',
      name: 'Chill',
      artwork: 'u'
    })
    expect(toPlaylist({ id: 'p.2' })).toEqual({ id: 'p.2', name: 'Untitled', artwork: undefined })
  })
})

describe('toTrack', () => {
  test('maps library song attributes', () => {
    expect(toTrack(song('i.1'))).toEqual({
      id: 'i.1',
      title: 'Song i.1',
      artist: 'Artist',
      album: 'Album',
      artwork: 'https://x/{w}x{h}bb.jpg',
      durationMs: 1000
    })
  })

  test('missing attributes fall back', () => {
    expect(toTrack({ id: 'i.2' })).toEqual({
      id: 'i.2',
      title: 'Unknown',
      artist: '',
      album: '',
      artwork: undefined,
      durationMs: 0
    })
  })
})

describe('nextParams', () => {
  test('reads the query of a next link', () => {
    expect(nextParams('/v1/me/library/playlists/p.1/tracks?offset=100')).toEqual({ offset: '100' })
  })
})

describe('fetchAll', () => {
  test('follows next links until the last page', async () => {
    const { mk, calls } = fakeMk((path, params) =>
      params?.offset === '2'
        ? { status: 200, data: { data: [song('c')] } }
        : { status: 200, data: { data: [song('a'), song('b')], next: `${path}?offset=2` } }
    )
    const all = await fetchAll(mk, '/v1/x')
    expect(all.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(calls).toEqual([
      ['/v1/x', { limit: 100 }],
      ['/v1/x', { limit: 100, offset: '2' }]
    ])
  })

  test('stops on a repeated next link', async () => {
    const { mk, calls } = fakeMk((path) => ({ status: 200, data: { data: [song('a')], next: `${path}?offset=1` } }))
    expect((await fetchAll(mk, '/v1/x')).length).toBe(2)
    expect(calls).toHaveLength(2)
  })

  test('404 means no resources', async () => {
    const { mk } = fakeMk(() => ({ status: 404, data: { errors: [] } }))
    expect(await fetchAll(mk, '/v1/x')).toEqual([])
  })

  test('other errors reject', async () => {
    const { mk } = fakeMk(() => ({ status: 500, data: {} }))
    await expect(fetchAll(mk, '/v1/x')).rejects.toThrow('HTTP 500')
  })
})

describe('getPlaylists / getPlaylistTracks', () => {
  test('hit the library endpoints and map results', async () => {
    const { mk, calls } = fakeMk((path) =>
      path.endsWith('/tracks')
        ? { status: 200, data: { data: [song('i.1')] } }
        : { status: 200, data: { data: [{ id: 'p.1', attributes: { name: 'Chill' } }] } }
    )
    expect((await getPlaylists(mk)).map((p) => p.name)).toEqual(['Chill'])
    expect((await getPlaylistTracks(mk, 'p.1')).map((t) => t.id)).toEqual(['i.1'])
    expect(calls.map(([path]) => path)).toEqual([
      '/v1/me/library/playlists',
      '/v1/me/library/playlists/p.1/tracks'
    ])
  })
})
