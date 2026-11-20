import { describe, expect, test } from 'bun:test'
import type { MediaItem, MusicKitInstance, QueueOptions } from './musickit'
import {
  currentIndex,
  fetchArtworkColor,
  nowPlaying,
  onNowPlaying,
  onPlayback,
  playbackInfo,
  playPlaylist,
  playSong,
  skipNext,
  skipPrevious,
  seek,
  toColor,
  toNowPlaying,
  togglePlay
} from './player'

function fakeMk(playbackState = 0, queueIds: string[] = [], api = async (_path: string) => ({ status: 200, data: {} as unknown })) {
  const listeners = new Map<string, Set<() => void>>()
  const calls: string[] = []
  const mk = {
    isAuthorized: true,
    playbackState,
    currentPlaybackTime: 42,
    currentPlaybackDuration: 200,
    authorize: async () => {},
    setQueue: async (o: QueueOptions) => {
      calls.push(`setQueue ${JSON.stringify(o)}`)
      mk.queue.position = o.startWith ?? 0
    },
    queue: {
      items: queueIds.map((id): MediaItem => ({ id })),
      position: 0,
      get currentItem(): MediaItem | undefined {
        return this.items[this.position]
      }
    },
    changeToMediaAtIndex: async (i: number) => {
      calls.push(`changeTo ${i}`)
      mk.queue.position = i
    },
    skipToNextItem: async () => void calls.push('next'),
    skipToPreviousItem: async () => void calls.push('previous'),
    seekToTime: async (t: number) => void calls.push(`seek ${t}`),
    storefrontId: 'us',
    play: async () => void calls.push('play'),
    pause: () => void calls.push('pause'),
    addEventListener: (n: string, cb: () => void) => {
      if (!listeners.has(n)) listeners.set(n, new Set())
      listeners.get(n)!.add(cb)
    },
    removeEventListener: (n: string, cb: () => void) => void listeners.get(n)?.delete(cb),
    api: { music: api }
  } satisfies MusicKitInstance
  const emit = (n: string): void => listeners.get(n)?.forEach((cb) => cb())
  return { mk, calls, emit, listeners }
}

describe('playbackInfo', () => {
  test('maps playing state and times', () => {
    expect(playbackInfo(fakeMk(2).mk)).toEqual({ playing: true, time: 42, duration: 200 })
    expect(playbackInfo(fakeMk(3).mk).playing).toBe(false)
  })
})

describe('playSong', () => {
  test('queues the song and starts it', async () => {
    const { mk, calls } = fakeMk()
    await playSong(mk, '123')
    expect(calls).toEqual(['setQueue {"song":"123","startPlaying":true}'])
  })
})

describe('playPlaylist', () => {
  test('queues the playlist starting at the given track', async () => {
    const { mk, calls } = fakeMk()
    await playPlaylist(mk, 'p.abc', 3)
    await playPlaylist(mk, 'p.abc')
    expect(calls).toEqual([
      'setQueue {"playlist":"p.abc","startWith":3,"startPlaying":true}',
      'setQueue {"playlist":"p.abc","startWith":0,"startPlaying":true}'
    ])
  })

  test('stays put when the queue lines up with our list', async () => {
    const { mk, calls } = fakeMk(0, ['a', 'b', 'c'])
    await playPlaylist(mk, 'p.abc', 1, 'b')
    expect(calls).toEqual(['setQueue {"playlist":"p.abc","startWith":1,"startPlaying":true}'])
  })

  test("jumps to the tapped track when MusicKit's queue differs (e.g. a dropped track)", async () => {
    const { mk, calls } = fakeMk(0, ['a', 'c', 'd'])
    await playPlaylist(mk, 'p.abc', 2, 'c')
    expect(calls.at(-1)).toBe('changeTo 1')
    expect(mk.queue.position).toBe(1)
  })

  test('falls back to the index when the track is not in the queue', async () => {
    const { mk, calls } = fakeMk(0, ['a', 'b'])
    await playPlaylist(mk, 'p.abc', 1, 'zzz')
    expect(calls).toHaveLength(1)
  })
})

describe('togglePlay', () => {
  test('pauses when playing, plays otherwise', async () => {
    const a = fakeMk(2)
    await togglePlay(a.mk)
    expect(a.calls).toEqual(['pause'])
    const b = fakeMk(3)
    await togglePlay(b.mk)
    expect(b.calls).toEqual(['play'])
  })
})

describe('onPlayback', () => {
  test('reports on playback events until unsubscribed', () => {
    const { mk, emit, listeners } = fakeMk(2)
    const seen: number[] = []
    const off = onPlayback(mk, (i) => seen.push(i.time))
    emit('playbackTimeDidChange')
    emit('playbackStateDidChange')
    off()
    emit('playbackTimeDidChange')
    expect(seen).toEqual([42, 42])
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true)
  })
})

describe('toColor', () => {
  test("Apple's rrggbb -> #rrggbb, anything else -> undefined", () => {
    expect(toColor('2B3334')).toBe('#2b3334')
    expect(toColor(undefined)).toBeUndefined()
    expect(toColor('#2b3334')).toBeUndefined()
    expect(toColor('fff')).toBeUndefined()
  })
})

describe('toNowPlaying', () => {
  test('maps a library queue item', () => {
    const item: MediaItem = {
      id: 'i.abc',
      attributes: {
        name: '90210',
        artistName: 'Travis Scott',
        durationInMillis: 339061,
        artwork: { url: 'https://x/{w}x{h}bb.jpg' },
        playParams: { catalogId: '1456177229' }
      }
    }
    expect(toNowPlaying(item)).toEqual({
      id: 'i.abc',
      title: '90210',
      artist: 'Travis Scott',
      artwork: 'https://x/{w}x{h}bb.jpg',
      durationMs: 339061,
      color: undefined,
      catalogId: '1456177229'
    })
  })

  test('takes the artwork colour when present, falls back on missing attributes', () => {
    expect(toNowPlaying({ id: '1', attributes: { artwork: { bgColor: 'aabbcc' } } }).color).toBe('#aabbcc')
    expect(toNowPlaying({ id: '1' })).toMatchObject({ id: '1', title: 'Unknown', artist: '', durationMs: 0 })
  })
})

describe('nowPlaying / onNowPlaying', () => {
  test('reads the current queue item and reports changes until unsubscribed', () => {
    const { mk, emit, listeners } = fakeMk(0, ['a', 'b'])
    expect(nowPlaying(mk)?.id).toBe('a')
    const seen: (string | undefined)[] = []
    const off = onNowPlaying(mk, (item) => seen.push(item?.id))
    mk.queue.position = 1
    emit('queuePositionDidChange')
    mk.queue.position = 5
    emit('nowPlayingItemDidChange')
    off()
    emit('nowPlayingItemDidChange')
    expect(seen).toEqual(['b', undefined])
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true)
  })
})

describe('fetchArtworkColor', () => {
  test("reads the catalog song's artwork colour", async () => {
    const paths: string[] = []
    const { mk } = fakeMk(0, [], async (path) => {
      paths.push(path)
      return { status: 200, data: { data: [{ id: '1', attributes: { artwork: { bgColor: '2b3334' } } }] } }
    })
    expect(await fetchArtworkColor(mk, '1456177229')).toBe('#2b3334')
    expect(paths).toEqual(['/v1/catalog/us/songs/1456177229'])
  })

  test('throws on a failed lookup (so it can be retried)', async () => {
    await expect(fetchArtworkColor(fakeMk(0, [], async () => ({ status: 503, data: {} })).mk, '1')).rejects.toThrow('HTTP 503')
  })

  test('undefined for a song not in the catalog or without colour', async () => {
    expect(await fetchArtworkColor(fakeMk(0, [], async () => ({ status: 404, data: {} })).mk, '1')).toBeUndefined()
    expect(await fetchArtworkColor(fakeMk(0, [], async () => ({ status: 200, data: { data: [{ id: '1' }] } })).mk, '1')).toBeUndefined()
  })
})

describe('skipNext / skipPrevious / seek', () => {
  test('next skips', async () => {
    const { mk, calls } = fakeMk()
    await skipNext(mk)
    expect(calls).toEqual(['next'])
  })

  test('previous restarts the song past 3s, goes back near the start', async () => {
    const a = fakeMk(2, ['a', 'b'])
    a.mk.queue.position = 1
    await skipPrevious(a.mk) // fake time is 42s
    expect(a.calls).toEqual(['seek 0'])

    const b = fakeMk(2, ['a', 'b'])
    b.mk.queue.position = 1
    b.mk.currentPlaybackTime = 2
    await skipPrevious(b.mk)
    expect(b.calls).toEqual(['previous'])
  })

  test('previous on the first song restarts it', async () => {
    const { mk, calls } = fakeMk(2, ['a'])
    mk.currentPlaybackTime = 1
    await skipPrevious(mk)
    expect(calls).toEqual(['seek 0'])
  })

  test('seek pauses while it loads, then resumes if asked', async () => {
    const a = fakeMk(2)
    await seek(a.mk, 12.5, () => true)
    expect(a.calls).toEqual(['pause', 'seek 12.5', 'play'])

    const b = fakeMk(2)
    await seek(b.mk, 12.5, () => false)
    expect(b.calls).toEqual(['pause', 'seek 12.5'])
  })

  test('seek while paused stays paused, clamps at 0', async () => {
    const { mk, calls } = fakeMk(3)
    await seek(mk, -3, () => false)
    expect(calls).toEqual(['seek 0'])
  })
})

describe('currentIndex', () => {
  test('finds the current song', () => {
    expect(currentIndex(['a', 'b', 'c'], 'b', 1)).toBe(1)
    expect(currentIndex(['a', 'b', 'c'], 'z', 1)).toBe(-1)
  })

  test('a song listed twice -> the copy nearest the queue position', () => {
    expect(currentIndex(['a', 'b', 'a', 'c', 'a'], 'a', 3)).toBe(2)
    expect(currentIndex(['a', 'b', 'a', 'c', 'a'], 'a', 4)).toBe(4)
    expect(currentIndex(['a', 'b', 'a'], 'a', 0)).toBe(0)
  })
})
