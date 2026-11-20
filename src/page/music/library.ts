// The signed-in user's library: playlists and their tracks.
import type { ApiParams, MusicKitInstance } from './musickit'
import type { Playlist, Track } from './types'

/** max page size for /v1/me/library endpoints */
const PAGE_LIMIT = 100

interface ApiArtwork {
  url?: string
}

interface ApiResource {
  id: string
  attributes?: {
    name?: string
    artistName?: string
    albumName?: string
    durationInMillis?: number
    artwork?: ApiArtwork
  }
}

interface ApiPage {
  data?: ApiResource[]
  next?: string
}

export function toPlaylist(r: ApiResource): Playlist {
  return { id: r.id, name: r.attributes?.name ?? 'Untitled', artwork: r.attributes?.artwork?.url }
}

export function toTrack(r: ApiResource): Track {
  const a = r.attributes
  return {
    id: r.id,
    title: a?.name ?? 'Unknown',
    artist: a?.artistName ?? '',
    album: a?.albumName ?? '',
    artwork: a?.artwork?.url,
    durationMs: a?.durationInMillis ?? 0
  }
}

/** The params of an API `next` link (e.g. `/v1/...?offset=100` -> `{ offset: '100' }`). */
export function nextParams(next: string): ApiParams {
  return Object.fromEntries(new URL(next, 'https://api.music.apple.com').searchParams)
}

/**
 * Every resource of a paginated endpoint, following `next` links.
 * 404 means "no resources" (e.g. an empty playlist's tracks) -> [].
 */
export async function fetchAll(mk: MusicKitInstance, path: string): Promise<ApiResource[]> {
  const all: ApiResource[] = []
  let params: ApiParams = { limit: PAGE_LIMIT }
  const seen = new Set<string>()
  for (;;) {
    const res = await mk.api.music(path, params)
    if (res.status === 404) break
    if (res.status < 200 || res.status >= 300) throw new Error(`${path}: HTTP ${res.status}`)
    const page = res.data as ApiPage
    all.push(...(page.data ?? []))
    // a repeated `next` would loop forever
    if (!page.next || seen.has(page.next)) break
    seen.add(page.next)
    params = { limit: PAGE_LIMIT, ...nextParams(page.next) }
  }
  return all
}

export async function getPlaylists(mk: MusicKitInstance): Promise<Playlist[]> {
  return (await fetchAll(mk, '/v1/me/library/playlists')).map(toPlaylist)
}

export async function getPlaylistTracks(mk: MusicKitInstance, playlistId: string): Promise<Track[]> {
  const path = `/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`
  return (await fetchAll(mk, path)).map(toTrack)
}
