import { whenMusicKitReady, type MusicKitInstance } from '../music/musickit'
import { onPlayback, playbackInfo, playPlaylist, togglePlay } from '../music/player'

/** Now-playing state from MusicKit events. `start()` once signed in, it returns the cleanup. */
class Player {
  playing = $state(false)
  time = $state(0)
  duration = $state(0)
  error = $state<string | undefined>()
  #mk: MusicKitInstance | undefined
  #request = 0

  start(): () => void {
    const ctl = new AbortController()
    let unsubscribe: (() => void) | undefined
    whenMusicKitReady(ctl.signal).then(
      (mk) => {
        if (ctl.signal.aborted) return
        this.#mk = mk
        const update = ({ playing, time, duration }: ReturnType<typeof playbackInfo>): void => {
          this.playing = playing
          this.time = time
          this.duration = duration
        }
        update(playbackInfo(mk))
        unsubscribe = onPlayback(mk, update)
      },
      (err) => {
        if (!ctl.signal.aborted) console.error('[pod] MusicKit not ready:', err)
      }
    )
    return () => {
      ctl.abort()
      unsubscribe?.()
      this.#mk = undefined
    }
  }

  /** plays a playlist from track `index` (`trackId` guards against the queue not matching our list) */
  async playPlaylist(playlistId: string, index = 0, trackId?: string): Promise<void> {
    await this.#run(playPlaylist, playlistId, index, trackId)
  }

  async toggle(): Promise<void> {
    await this.#run(togglePlay)
  }

  async #run<A extends unknown[]>(
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
      if (req === this.#request) this.error = "Couldn't play. Try again."
    }
  }
}

export const player = new Player()
