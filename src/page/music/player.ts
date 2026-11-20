// Playback through the page's MusicKit (full tracks for subscribers, Widevine via castLabs).
import type { ApiArtwork, MediaItem, MusicKitInstance } from './musickit'
import type { ArtworkColors, NowPlaying } from './types'

/** MusicKit.PlaybackStates.playing */
const PLAYING = 2

/** seconds into a song after which "previous" restarts it instead of going back */
export const RESTART_AFTER = 3

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

/** `#rrggbb` from Apple's `rrggbb`, undefined for anything else */
export function toColor(hex: string | undefined): string | undefined {
  return hex && /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : undefined
}

/** the artwork's palette, undefined without a valid background colour */
export function toArtworkColors(artwork: ApiArtwork | undefined): ArtworkColors | undefined {
  const bg = toColor(artwork?.bgColor)
  if (!bg || !artwork) return undefined
  const text = [artwork.textColor1, artwork.textColor2, artwork.textColor3, artwork.textColor4]
    .map(toColor)
    .filter((c) => c !== undefined)
  return { bg, text }
}

export function toNowPlaying(item: MediaItem): NowPlaying {
  const a = item.attributes
  return {
    id: item.id,
    title: a?.name ?? 'Unknown',
    artist: a?.artistName ?? '',
    artwork: a?.artwork?.url,
    durationMs: a?.durationInMillis ?? 0,
    colors: toArtworkColors(a?.artwork),
    catalogId: a?.playParams?.catalogId
  }
}

/**
 * Which row of a list is the current song: the one with its id nearest the queue position
 * (a song can be in a list twice; the queue can be shifted by dropped tracks). -1 = none.
 */
export function currentIndex(ids: readonly string[], currentId: string, position: number): number {
  let best = -1
  ids.forEach((id, i) => {
    if (id === currentId && (best < 0 || Math.abs(i - position) < Math.abs(best - position))) best = i
  })
  return best
}

export function nowPlaying(mk: MusicKitInstance): NowPlaying | undefined {
  const item = mk.queue.currentItem
  return item ? toNowPlaying(item) : undefined
}

/** Calls `cb` when the current song changes. Returns an unsubscribe function. */
export function onNowPlaying(mk: MusicKitInstance, cb: (item: NowPlaying | undefined) => void): () => void {
  const handler = (): void => cb(nowPlaying(mk))
  const events = ['nowPlayingItemDidChange', 'queueItemsDidChange', 'queuePositionDidChange']
  for (const name of events) mk.addEventListener(name, handler)
  return () => {
    for (const name of events) mk.removeEventListener(name, handler)
  }
}

/**
 * The catalog song's artwork palette, undefined if it has none (or isn't in this storefront: 404).
 * Throws on other failures, so they can be retried.
 */
export async function fetchArtworkColors(mk: MusicKitInstance, catalogId: string): Promise<ArtworkColors | undefined> {
  const path = `/v1/catalog/${mk.storefrontId}/songs/${encodeURIComponent(catalogId)}`
  const res = await mk.api.music(path)
  if (res.status === 404) return undefined
  if (res.status < 200 || res.status >= 300) throw new Error(`${path}: HTTP ${res.status}`)
  const song = (res.data as { data?: MediaItem[] } | undefined)?.data?.[0]
  return toArtworkColors(song?.attributes?.artwork)
}

export async function skipNext(mk: MusicKitInstance): Promise<void> {
  await mk.skipToNextItem()
}

/** Restarts the song once it's past `RESTART_AFTER` seconds (or it's the first), else goes back one. */
export async function skipPrevious(mk: MusicKitInstance): Promise<void> {
  if (mk.currentPlaybackTime > RESTART_AFTER || mk.queue.position <= 0) await mk.seekToTime(0)
  else await mk.skipToPreviousItem()
}

/**
 * Jumps to `seconds`. MusicKit keeps playing the old position until the new one has loaded
 * (seconds, for an unbuffered spot), so playback pauses meanwhile; afterwards it plays again
 * if `resume()` says so (asked then, so a pause or newer seek in the meantime wins).
 */
export async function seek(mk: MusicKitInstance, seconds: number, resume: () => boolean): Promise<void> {
  if (mk.playbackState === PLAYING) mk.pause()
  await mk.seekToTime(Math.max(0, seconds))
  if (resume()) await mk.play()
}
