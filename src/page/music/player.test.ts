import { describe, expect, test } from 'bun:test'
import type { MusicKitInstance, QueueOptions } from './musickit'
import { onPlayback, playbackInfo, playPlaylist, playSong, togglePlay } from './player'

function fakeMk(playbackState = 0, queueIds: string[] = []) {
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
    queue: { items: queueIds.map((id) => ({ id })), position: 0 },
    changeToMediaAtIndex: async (i: number) => {
      calls.push(`changeTo ${i}`)
      mk.queue.position = i
    },
    play: async () => void calls.push('play'),
    pause: () => void calls.push('pause'),
    addEventListener: (n: string, cb: () => void) => {
      if (!listeners.has(n)) listeners.set(n, new Set())
      listeners.get(n)!.add(cb)
    },
    removeEventListener: (n: string, cb: () => void) => void listeners.get(n)?.delete(cb),
    api: { music: async () => ({ status: 200, data: {} }) }
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
