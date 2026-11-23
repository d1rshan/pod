// Catalog search (songs only).
import { toTrack } from './library'
import type { MusicKitInstance } from './musickit'
import type { Track } from './types'

/** the catalog search endpoint's max page size */
export const SEARCH_LIMIT = 25

interface SearchResponse {
  results?: { songs?: { data?: Parameters<typeof toTrack>[0][] } }
}

/** the term as we send it: trimmed, inner whitespace collapsed ('' = nothing to search) */
export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ')
}

/** the songs of a search response (none when Apple found nothing: `results` is empty then) */
export function toSearchTracks(data: unknown): Track[] {
  return ((data as SearchResponse | undefined)?.results?.songs?.data ?? []).map(toTrack)
}

/** Catalog songs matching `term`, in the user's storefront. Their ids are catalog song ids. */
export async function searchSongs(mk: MusicKitInstance, term: string): Promise<Track[]> {
  const q = normalizeTerm(term)
  if (!q) return []
  const path = `/v1/catalog/${mk.storefrontId}/search`
  const res = await mk.api.music(path, { term: q, types: 'songs', limit: SEARCH_LIMIT })
  if (res.status === 404) return []
  if (res.status < 200 || res.status >= 300) throw new Error(`${path}: HTTP ${res.status}`)
  return toSearchTracks(res.data)
}
