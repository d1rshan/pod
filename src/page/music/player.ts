// Playback through the page's MusicKit (full tracks for subscribers, Widevine via castLabs).
import type { MusicKitInstance } from './musickit'

/** MusicKit.PlaybackStates.playing */
const PLAYING = 2

export interface PlaybackInfo {
  playing: boolean
  /** seconds */
  time: number
  /** seconds */
  duration: number
}

export function playbackInfo(mk: MusicKitInstance): PlaybackInfo {
  return {
    playing: mk.playbackState === PLAYING,
    time: mk.currentPlaybackTime,
    duration: mk.currentPlaybackDuration
  }
}

/** Replaces the queue with one catalog song and starts it. */
export async function playSong(mk: MusicKitInstance, songId: string): Promise<void> {
  await mk.setQueue({ song: songId, startPlaying: true })
}

/**
 * Replaces the queue with a playlist and starts at track `index` (its position in our list).
 * If MusicKit's queue doesn't line up with our list (unavailable tracks dropped, playlist
 * edited since we loaded it), jumps to `trackId` in the queue instead.
 */
export async function playPlaylist(
  mk: MusicKitInstance,
  playlistId: string,
  index = 0,
  trackId?: string
): Promise<void> {
  await mk.setQueue({ playlist: playlistId, startWith: index, startPlaying: true })
  if (trackId === undefined || mk.queue.items[mk.queue.position]?.id === trackId) return
  const found = mk.queue.items.findIndex((item) => item.id === trackId)
  if (found >= 0) await mk.changeToMediaAtIndex(found)
}

export async function togglePlay(mk: MusicKitInstance): Promise<void> {
  if (mk.playbackState === PLAYING) mk.pause()
  else await mk.play()
}

/** Calls `cb` on play/pause and while the playhead moves. Returns an unsubscribe function. */
export function onPlayback(mk: MusicKitInstance, cb: (info: PlaybackInfo) => void): () => void {
  const handler = (): void => cb(playbackInfo(mk))
  const events = ['playbackStateDidChange', 'playbackTimeDidChange', 'playbackDurationDidChange']
  for (const name of events) mk.addEventListener(name, handler)
  return () => {
    for (const name of events) mk.removeEventListener(name, handler)
  }
}
