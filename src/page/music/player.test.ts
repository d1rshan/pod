import { describe, expect, test } from 'bun:test'
import type { MusicKitInstance } from './musickit'
import { onPlayback, playbackInfo, playSong, togglePlay } from './player'

function fakeMk(playbackState = 0) {
  const listeners = new Map<string, Set<() => void>>()
  const calls: string[] = []
  const mk = {
    isAuthorized: true,
    playbackState,
    currentPlaybackTime: 42,
    currentPlaybackDuration: 200,
    authorize: async () => {},
    setQueue: async (o: { song: string; startPlaying?: boolean }) => {
      calls.push(`setQueue ${o.song} ${o.startPlaying}`)
    },
    play: async () => void calls.push('play'),
    pause: () => void calls.push('pause'),
    addEventListener: (n: string, cb: () => void) => {
      if (!listeners.has(n)) listeners.set(n, new Set())
      listeners.get(n)!.add(cb)
    },
    removeEventListener: (n: string, cb: () => void) => void listeners.get(n)?.delete(cb)
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
    expect(calls).toEqual(['setQueue 123 true'])
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
