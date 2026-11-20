/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
  interface Window {
    pod: Record<string, never>
  }
}

export {}
