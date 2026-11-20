/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
  interface Window {
    /** the currently injected pod UI (lets a dev re-inject replace it) */
    __pod?: { destroy(): void }
  }
}

export {}
