import { describe, expect, test } from 'bun:test'
import type { ApiParams, ApiResponse, MusicKitInstance } from './musickit'
import { normalizeTerm, searchSongs, SEARCH_LIMIT, toSearchTracks } from './search'

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
    skipToNextItem: async () => {},
    skipToPreviousItem: async () => {},
    seekToTime: async () => {},
    storefrontId: 'in',
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
  type: 'songs',
  attributes: { name: `Song ${id}`, artistName: 'Artist', albumName: 'Album', durationInMillis: 1000, artwork: { url: 'u' } }
})

describe('normalizeTerm', () => {
  test('trims and collapses whitespace', () => {
    expect(normalizeTerm('  blinding \t lights \n')).toBe('blinding lights')
    expect(normalizeTerm('   ')).toBe('')
  })
})

describe('toSearchTracks', () => {
  test('maps the songs', () => {
    expect(toSearchTracks({ results: { songs: { data: [song('1')] } } })).toEqual([
      { id: '1', title: 'Song 1', artist: 'Artist', album: 'Album', artwork: 'u', durationMs: 1000 }
    ])
  })
  test('no matches: empty results', () => {
    expect(toSearchTracks({ results: {} })).toEqual([])
    expect(toSearchTracks(undefined)).toEqual([])
  })
})

describe('searchSongs', () => {
  test('searches songs in the storefront', async () => {
    const { mk, calls } = fakeMk(() => ({ status: 200, data: { results: { songs: { data: [song('1'), song('2')] } } } }))
    const tracks = await searchSongs(mk, ' the  weeknd ')
    expect(tracks.map((t) => t.id)).toEqual(['1', '2'])
    expect(calls).toEqual([['/v1/catalog/in/search', { term: 'the weeknd', types: 'songs', limit: SEARCH_LIMIT }]])
  })
  test('blank term: no request', async () => {
    const { mk, calls } = fakeMk(() => ({ status: 200, data: {} }))
    expect(await searchSongs(mk, '  ')).toEqual([])
    expect(calls).toEqual([])
  })
  test('404 = nothing, other errors throw', async () => {
    expect(await searchSongs(fakeMk(() => ({ status: 404, data: null })).mk, 'x')).toEqual([])
    await expect(searchSongs(fakeMk(() => ({ status: 500, data: null })).mk, 'x')).rejects.toThrow('HTTP 500')
  })
})
