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
  /** artwork background as `#rrggbb` when the item carries one (catalog songs do, library songs don't) */
  color?: string
  /** catalog id, to look up `color` for library songs */
  catalogId?: string
}
