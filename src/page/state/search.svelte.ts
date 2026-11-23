import { whenMusicKitReady } from '../music/musickit'
import { normalizeTerm, searchSongs } from '../music/search'
import type { Track } from '../music/types'
import type { Loadable } from './library.svelte'

/** ms of no typing before a search goes out */
const DEBOUNCE_MS = 350

/** Discover's search: the field's text and its results (kept across tab switches). */
class Search {
  term = $state('')
  /** the term `results` are for ('' = nothing searched yet) */
  searched = $state('')
  results = $state.raw<Loadable<Track[]>>({ loading: false })
  #timer: ReturnType<typeof setTimeout> | undefined
  #request = 0

  /** the field changed: search once typing settles */
  input(term: string): void {
    this.term = term
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => void this.run(), DEBOUNCE_MS)
  }

  /** search the field's text now (enter, retry) */
  async run(): Promise<void> {
    clearTimeout(this.#timer)
    const q = normalizeTerm(this.term)
    // same text as what's shown (e.g. a trailing space, or enter after the debounce fired)
    if (q === this.searched && !this.results.error) return
    const req = ++this.#request
    this.searched = q
    if (!q) {
      this.results = { loading: false }
      return
    }
    this.results = { ...this.results, loading: true, error: undefined }
    try {
      const data = await searchSongs(await whenMusicKitReady(), q)
      if (req === this.#request) this.results = { data, loading: false }
    } catch (err) {
      console.error('[pod] search failed:', err)
      // drops the last term's songs: they'd look like results for this one
      if (req === this.#request) this.results = { loading: false, error: "Couldn't search. Try again." }
    }
  }

  /** empty the field and the results */
  clear(): void {
    clearTimeout(this.#timer)
    this.#request++
    this.term = ''
    this.searched = ''
    this.results = { loading: false }
  }
}

export const search = new Search()
