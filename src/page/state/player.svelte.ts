import { whenMusicKitReady, type MusicKitInstance } from '../music/musickit'
import {
  fetchArtworkColors,
  nowPlaying,
  onNowPlaying,
  onPlayback,
  playbackInfo,
  playPlaylist,
  preciseTime,
  seek,
  skipNext,
  skipPrevious,
  togglePlay,
  type PlaybackInfo
} from '../music/player'
import type { ArtworkColors, NowPlaying } from '../music/types'

/** s: how far the precise playhead may be from the (rounded, ~4/s) reported time and still be trusted */
const NOW_TOLERANCE = 1.5
/** after a song change MusicKit briefly reports the old song's time: for this long (ms), times past
 * `STALE_AFTER` s are ignored, until it reports one near the start */
const STALE_MS = 2000
const STALE_AFTER = 2

/** Now-playing state from MusicKit events. `start()` once signed in, it returns the cleanup. */
class Player {
  playing = $state(false)
  time = $state(0)
  duration = $state(0)
  /** the queue's current song (undefined = nothing queued) */
  current = $state.raw<NowPlaying | undefined>()
  /** the current song's position in the queue */
  position = $state(0)
  /** the library playlist we queued last (undefined = the queue came from elsewhere) */
  playlistId = $state<string | undefined>()
  /** artwork palette of `current`, once known */
  colors = $state.raw<ArtworkColors | undefined>()
  error = $state<string | undefined>()
  #mk: MusicKitInstance | undefined
  #request = 0
  /** catalog id -> artwork palette (undefined = the song has none) */
  #palettes = new Map<string, ArtworkColors | undefined>()
  /** a seek in flight: the bar holds `target`, the button shows `resume` (play once it lands?) */
  #seek: { target: number; resume: boolean } | undefined
  /** see `STALE_MS` (0 = not waiting) */
  #staleUntil = 0

  start(): () => void {
    const ctl = new AbortController()
    const unsubscribe: (() => void)[] = []
    whenMusicKitReady(ctl.signal).then(
      (mk) => {
        if (ctl.signal.aborted) return
        this.#mk = mk
        // already playing (e.g. the UI reloaded): its time is real
        this.#setCurrent(nowPlaying(mk), mk.queue.position, false)
        this.#update(playbackInfo(mk))
        unsubscribe.push(
          onPlayback(mk, (info) => this.#update(info)),
          onNowPlaying(mk, (item) => this.#setCurrent(item, mk.queue.position))
        )
      },
      (err) => {
        if (!ctl.signal.aborted) console.error('[pod] MusicKit not ready:', err)
      }
    )
    return () => {
      ctl.abort()
      for (const off of unsubscribe) off()
      this.#mk = undefined
      this.#seek = undefined
      this.current = undefined
      this.playlistId = undefined
      this.colors = undefined
    }
  }

  /** plays a playlist from track `index` (`trackId` guards against the queue not matching our list) */
  async playPlaylist(playlistId: string, index = 0, trackId?: string): Promise<void> {
    await this.#run("Couldn't play. Try again.", async (mk) => {
      this.playlistId = undefined // the old queue is gone even if this one fails
      await playPlaylist(mk, playlistId, index, trackId)
      this.playlistId = playlistId
    })
  }

  async toggle(): Promise<void> {
    // mid-seek MusicKit is paused while it loads; just change what happens once it lands
    const s = this.#seek
    if (s) {
      s.resume = !s.resume
      this.playing = s.resume
      return
    }
    await this.#run("Couldn't play. Try again.", togglePlay)
  }

  async next(): Promise<void> {
    await this.#run("Couldn't skip. Try again.", skipNext)
  }

  async previous(): Promise<void> {
    await this.#run("Couldn't skip. Try again.", skipPrevious)
  }

  /** the playhead to the millisecond, read fresh (per animation frame); seconds */
  now(): number {
    if (this.#seek) return this.#seek.target
    if (!this.#mk) return this.time
    // right after a song change MusicKit and its audio can still be on the old song: until they
    // agree with the reported time (reset to 0 then, otherwise a few hundred ms behind), use that
    const t = preciseTime(this.#mk)
    return Math.abs(t - this.time) <= NOW_TOLERANCE ? t : this.time
  }

  /** seconds */
  async seek(time: number): Promise<void> {
    if (!this.#mk) return
    // a seek during another keeps that one's intent (it already paused playback)
    const s = { target: time, resume: this.#seek?.resume ?? this.playing }
    this.#seek = s
    this.#staleUntil = 0 // the user picked this time: it isn't left over from the last song
    this.time = time
    this.playing = s.resume
    await this.#run("Couldn't seek. Try again.", seek, time, () => this.#seek === s && s.resume)
    if (this.#seek !== s) return // a newer seek or another song took over
    this.#seek = undefined
    if (this.#mk) this.#update(playbackInfo(this.#mk))
  }

  #update({ playing, time, duration }: PlaybackInfo): void {
    if (this.#staleUntil) {
      if (performance.now() < this.#staleUntil && time > STALE_AFTER) {
        this.playing = playing
        return
      }
      this.#staleUntil = 0
    }
    this.duration = duration
    // while a seek loads MusicKit reports the old position and "paused"; hold the target instead
    if (this.#seek) return
    this.playing = playing
    this.time = time
  }

  #setCurrent(item: NowPlaying | undefined, position: number, changed = true): void {
    this.position = position
    // queue events repeat for the same song; keep the object so dependents don't re-run
    if (item?.id === this.current?.id) return
    this.current = item
    // the old song's time until MusicKit reports the new one (duration falls back to the song's)
    this.time = 0
    this.duration = 0
    this.#seek = undefined
    this.#staleUntil = changed && item ? performance.now() + STALE_MS : 0
    this.colors = item?.colors
    const id = item?.catalogId
    if (!item || item.colors || !id) return
    if (this.#palettes.has(id)) {
      this.colors = this.#palettes.get(id)
      return
    }
    const mk = this.#mk
    if (!mk) return
    fetchArtworkColors(mk, id).then(
      (colors) => {
        this.#palettes.set(id, colors)
        if (this.current?.id === item.id) this.colors = colors
      },
      // a plain background is fine; not cached, so the next time this song comes up tries again
      (err) => console.warn('[pod] artwork palette lookup failed:', err)
    )
  }

  async #run<A extends unknown[]>(
    message: string,
    fn: (mk: MusicKitInstance, ...args: A) => Promise<void>,
    ...args: A
  ): Promise<void> {
    const mk = this.#mk
    if (!mk) return
    const req = ++this.#request
    this.error = undefined
    try {
      await fn(mk, ...args)
    } catch (err) {
      console.error('[pod] playback failed:', err)
      // a failure of an older tap doesn't matter once a newer one was made
      if (req === this.#request) this.error = message
    }
  }
}

export const player = new Player()
