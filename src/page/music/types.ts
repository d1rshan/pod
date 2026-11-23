// Our app's shapes for Apple Music data (mapped from API resources in music/*).

export interface Playlist {
  id: string
  name: string
  /** Apple artwork URL template (`{w}x{h}`), see `artworkUrl` */
  artwork?: string
}

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  artwork?: string
  durationMs: number
}

/** The queue's current song (set before playback starts too) */
export interface NowPlaying {
  /** queue item id: library (`i.`) or catalog song id, same as `Track.id` */
  id: string
  title: string
  artist: string
  artwork?: string
  /** 0 = unknown */
  durationMs: number
  /** artwork palette as `#rrggbb` (background first, then its text colours) when the item carries
   * one: catalog songs do, library songs don't. See `ArtworkColors`. */
  colors?: ArtworkColors
  /** catalog song id (undefined for uploads): `colors` for library songs, lyrics */
  catalogId?: string
}

/** Apple's artwork palette: `bg` is the cover's background, `text` the colours picked to read on it */
export interface ArtworkColors {
  bg: string
  text: string[]
}
