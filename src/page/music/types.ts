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
