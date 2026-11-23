import { fetchLyrics, type Lyrics } from '../music/lyrics'
import { whenMusicKitReady } from '../music/musickit'
import type { NowPlaying } from '../music/types'

export type LyricsStatus = 'idle' | 'loading' | 'ready' | 'none' | 'error'

/** The current song's synced lyrics, fetched as soon as it comes up (the button knows if there are any). */
class LyricsStore {
  status = $state<LyricsStatus>('idle')
  lyrics = $state.raw<Lyrics | undefined>()
  /** catalog id -> lyrics (undefined = the song has none) */
  #cache = new Map<string, Lyrics | undefined>()
  #song: NowPlaying | undefined
  #request = 0

  /** shows `song`'s lyrics, loading them if needed */
  load(song: NowPlaying | undefined): void {
    this.#song = song
    const req = ++this.#request
    const id = song?.catalogId
    if (!id) {
      // nothing playing, or a library-only upload: no catalog lyrics
      this.lyrics = undefined
      this.status = song ? 'none' : 'idle'
      return
    }
    if (this.#cache.has(id)) {
      // from the local, not `this.lyrics`: reading state here would make the caller's effect depend on it
      const cached = this.#cache.get(id)
      this.lyrics = cached
      this.status = cached ? 'ready' : 'none'
      return
    }
    this.lyrics = undefined
    this.status = 'loading'
    whenMusicKitReady()
      .then((mk) => fetchLyrics(mk, id))
      .then(
        (lyrics) => {
          this.#cache.set(id, lyrics)
          if (req !== this.#request) return
          this.lyrics = lyrics
          this.status = lyrics ? 'ready' : 'none'
        },
        (err) => {
          // not cached: trying again (or the song coming up again) refetches
          console.warn('[pod] lyrics lookup failed:', err)
          if (req === this.#request) this.status = 'error'
        }
      )
  }

  retry(): void {
    this.load(this.#song)
  }

  reset(): void {
    this.#request++
    this.#song = undefined
    this.#cache.clear()
    this.lyrics = undefined
    this.status = 'idle'
  }
}

export const lyrics = new LyricsStore()
