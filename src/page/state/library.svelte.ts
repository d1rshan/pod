import { getPlaylists, getPlaylistTracks } from '../music/library'
import { whenMusicKitReady } from '../music/musickit'
import type { Playlist, Track } from '../music/types'

/** A list being fetched: the last good data stays shown while refreshing. */
export interface Loadable<T> {
  data?: T
  loading: boolean
  error?: string
}

/** The user's playlists and the tracks of the playlists they opened. */
class Library {
  playlists = $state<Loadable<Playlist[]>>({ loading: false })
  /** by playlist id */
  tracks = $state<Record<string, Loadable<Track[]>>>({})
  /** bumped on reset so in-flight loads from a previous session are dropped */
  #generation = 0
  #tracksRequest: Record<string, number> = {}
  #playlistsRequest = 0

  async loadPlaylists(): Promise<void> {
    const req = ++this.#playlistsRequest
    const gen = this.#generation
    this.playlists = { ...this.playlists, loading: true, error: undefined }
    try {
      const data = await getPlaylists(await whenMusicKitReady())
      if (gen === this.#generation && req === this.#playlistsRequest)
        this.playlists = { data, loading: false }
    } catch (err) {
      console.error('[pod] loading playlists failed:', err)
      if (gen === this.#generation && req === this.#playlistsRequest)
        this.playlists = { ...this.playlists, loading: false, error: "Couldn't load your playlists." }
    }
  }

  async loadTracks(playlistId: string): Promise<void> {
    const req = (this.#tracksRequest[playlistId] ?? 0) + 1
    this.#tracksRequest[playlistId] = req
    const gen = this.#generation
    const fresh = (): boolean => gen === this.#generation && req === this.#tracksRequest[playlistId]
    this.tracks[playlistId] = { ...this.tracks[playlistId], loading: true, error: undefined }
    try {
      const data = await getPlaylistTracks(await whenMusicKitReady(), playlistId)
      if (fresh()) this.tracks[playlistId] = { data, loading: false }
    } catch (err) {
      console.error('[pod] loading playlist tracks failed:', err)
      if (fresh())
        this.tracks[playlistId] = { ...this.tracks[playlistId], loading: false, error: "Couldn't load this playlist." }
    }
  }

  /** forget everything (signed out) */
  reset(): void {
    this.#generation++
    this.#tracksRequest = {}
    this.playlists = { loading: false }
    this.tracks = {}
  }
}

export const library = new Library()
