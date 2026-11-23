/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
  interface Window {
    /** the currently injected pod UI (lets a dev re-inject replace it) */
    __pod?: {
      destroy(): void
      /** our stores, for scripts driving the app over CDP (`bun run bench`); unpackaged builds only */
      debug?: {
        nav: typeof import('./state/nav.svelte').nav
        player: typeof import('./state/player.svelte').player
        library: typeof import('./state/library.svelte').library
        lyrics: typeof import('./state/lyrics.svelte').lyrics
      }
    }
    /** set by main before injecting in unpackaged builds */
    __podDebug?: boolean
  }
}

export {}
