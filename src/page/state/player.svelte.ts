import { whenMusicKitReady, type MusicKitInstance } from '../music/musickit'
import {
  fetchArtworkColor,
  nowPlaying,
  onNowPlaying,
  onPlayback,
  playbackInfo,
  playPlaylist,
  seek,
  skipNext,
  skipPrevious,
  togglePlay,
  type PlaybackInfo
} from '../music/player'
import type { NowPlaying } from '../music/types'

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
  /** artwork background (`#rrggbb`) of `current`, once known */
  color = $state<string | undefined>()
  error = $state<string | undefined>()
  #mk: MusicKitInstance | undefined
  #request = 0
  /** catalog id -> artwork colour (undefined = the song has none) */
  #colors = new Map<string, string | undefined>()
  /** a seek in flight: the bar holds `target`, the button shows `resume` (play once it lands?) */
  #seek: { target: number; resume: boolean } | undefined

  start(): () => void {
    const ctl = new AbortController()
    const unsubscribe: (() => void)[] = []
    whenMusicKitReady(ctl.signal).then(
      (mk) => {
        if (ctl.signal.aborted) return
        this.#mk = mk
        this.#setCurrent(nowPlaying(mk), mk.queue.position)
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
      this.color = undefined
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

  /** seconds */
  async seek(time: number): Promise<void> {
    if (!this.#mk) return
    // a seek during another keeps that one's intent (it already paused playback)
    const s = { target: time, resume: this.#seek?.resume ?? this.playing }
    this.#seek = s
    this.time = time
    this.playing = s.resume
    await this.#run("Couldn't seek. Try again.", seek, time, () => this.#seek === s && s.resume)
    if (this.#seek !== s) return // a newer seek or another song took over
    this.#seek = undefined
    if (this.#mk) this.#update(playbackInfo(this.#mk))
  }

  #update({ playing, time, duration }: PlaybackInfo): void {
    this.duration = duration
    // while a seek loads MusicKit reports the old position and "paused"; hold the target instead
    if (this.#seek) return
    this.playing = playing
    this.time = time
  }

  #setCurrent(item: NowPlaying | undefined, position: number): void {
    this.position = position
    // queue events repeat for the same song; keep the object so dependents don't re-run
    if (item?.id === this.current?.id) return
    this.current = item
    // the old song's time until MusicKit reports the new one (duration falls back to the song's)
    this.time = 0
    this.duration = 0
    this.#seek = undefined
    this.color = item?.color
    const id = item?.catalogId
    if (!item || item.color || !id) return
    if (this.#colors.has(id)) {
      this.color = this.#colors.get(id)
      return
    }
    const mk = this.#mk
    if (!mk) return
    fetchArtworkColor(mk, id).then(
      (color) => {
        this.#colors.set(id, color)
        if (this.current?.id === item.id) this.color = color
      },
      // no tint is fine; not cached, so the next time this song comes up tries again
      (err) => console.warn('[pod] artwork colour lookup failed:', err)
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
