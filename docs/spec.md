# POD

what is pod?

- ipod style music player which uses apple music's musickit.js for user's playlists, songs, browsing etc and read-only ie play only - no control over actions like "add to favorites" / "add to playlist" etc
- it is a desktop app, made with castLabs Electron

## stack

- castLabs Electron (Widevine for playback) loading `music.apple.com`, using its MusicKit - no Apple developer account
- Svelte + TypeScript, bun
- Linux first for now
- ~200MB RAM budget

## architecture

- single small, frameless, always-on-top window
- Apple's UI hidden, our Svelte UI on top
- Apple's DOM is hidden (`display: none`), not deleted, so MusicKit stays stable (removing it saves only ~2MB)
- Apple's page is parked on a not-found route, `/{account storefront}/pod`: MusicKit and Apple's app shell load,
  none of its catalog pages (home kept motion videos + ~100 images alive: ~180-300MB). The storefront must be the
  account's (else MusicKit plays previews only); main remembers it, the page re-parks on a mismatch
- talk only to the MusicKit API
- sign in once via Apple's login popup, session persisted

## code structure

```
src/
  main/      # electron: window, sign-in popup, inject
  preload/   # window controls
  shared/    # cross-process types + helpers (parked page URL)
  page/      # injected into music.apple.com
    music/   # only place touching MusicKit (player, playlists, search, lyrics)
    state/   # svelte rune stores (player, nav, theme)
    ui/      # screens/, components/, styles/tokens.css
```

- flow: ui → state → music → MusicKit
- nav: tabs, each with a small stack; no router

## screens (design: doop canvas GPK_jqny4n)

- sign in: first run, opens Apple's login popup
- playing: artwork over its own cover, rotating and blurred into colour (docs/ambient.md), title, progress, prev/play/next, lyrics button
- lyrics: synced word by word, apple's lyrics view look and motion (docs/lyrics.md), over the playing background
- library: user's playlists only
- playlist detail: tracks, active song highlighted
- discover: song search only (no recommendations for now)
- dark theme only (no light mode)
