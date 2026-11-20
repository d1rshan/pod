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
- Apple's DOM is hidden (`display: none`), not deleted, so MusicKit stays stable. Later: measure whether removing parts of it saves memory
- talk only to the MusicKit API
- sign in once via Apple's login popup, session persisted

## code structure

```
src/
  main/      # electron: window, sign-in popup, inject
  preload/   # window controls
  shared/    # cross-process types
  page/      # injected into music.apple.com
    music/   # only place touching MusicKit (player, playlists, search, lyrics)
    state/   # svelte rune stores (player, nav, theme)
    ui/      # screens/, components/, styles/tokens.css
```

- flow: ui → state → music → MusicKit
- nav: tabs, each with a small stack; no router

## screens (design: doop canvas GPK_jqny4n)

- sign in: first run, opens Apple's login popup
- playing: artwork (tinted bg), title, progress, prev/play/next, lyrics button
- lyrics: synced lyrics (risky - internal endpoint, test early)
- library: user's playlists only
- playlist detail: tracks, active song highlighted
- discover: song search only (no recommendations for now)
- light + dark themes
