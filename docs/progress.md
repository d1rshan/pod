# progress

## build order (riskiest first)

each step = one session. "done when" = what the user checks before merging.

- [x] **-1. workflow setup**
  - AGENTS.md + CLAUDE.md, docs/spec.md + docs/progress.md
  - dev-only CDP port 9222, playwright-cli for inspecting the app
  - `bun test` + `bun run check`

- [ ] **0. skeleton**
  - move `src/renderer` -> `src/page/` (`music/`, `state/`, `ui/`)
  - main loads `music.apple.com` (Chrome user-agent if Apple blocks Electron)
  - hide Apple's app root (`display: none`), inject our bundle, mount Svelte in a Shadow DOM
  - dev reload for the injected UI
  - `ui/styles/tokens.css` with light + dark vars from the canvas
  - done when: window shows our placeholder UI over the hidden Apple page; no console errors

- [ ] **1. sign in + MusicKit ready**
  - wait for Widevine (castLabs `components.whenReady()`), then for `MusicKit.getInstance()`
  - sign in screen (canvas frame "Sign in") -> `authorize()`
  - allow Apple login popup (Apple auth domains only), deny other popups
  - session persisted in `persist:pod`
  - done when: sign in once, restart app, still signed in

- [ ] **2. playback spike**
  - `music/player.ts`: play one hard-coded song
  - verify full-length playback (past 30s preview) via `eval` on playback time
  - quick check: can we fetch synced lyrics through the page's MusicKit?
  - done when: song plays audibly past 30s; lyrics feasibility noted below

- [ ] **3. library + playlist detail**
  - tab bar (Playing / Library / Discover), per-tab nav stacks
  - `music/library.ts`: user's playlists, playlist tracks -> our types (+ tests)
  - `ListRow`, `Artwork`, `BackLink` components
  - tap a track -> play playlist from that track
  - done when: browse playlists, open one, tap a song and it plays

- [ ] **4. playing screen**
  - `state/player.svelte.ts`: now playing, progress, playing/paused (from MusicKit events)
  - artwork with tinted bg (Apple artwork `bgColor`), title/artist, `ProgressBar`, `Transport`
  - active song highlighted in playlist detail
  - done when: controls work, progress moves, highlight follows the current song

- [ ] **5. discover**
  - `music/search.ts`: catalog search, songs only
  - search field + result rows, empty state before searching
  - tap a result -> plays
  - done when: search a song, tap, it plays

- [ ] **6. lyrics** (only if step 2 says feasible)
  - lyrics screen from Playing (no tab bar), synced lines, current line highlighted
  - done when: lyrics scroll in sync with playback

- [ ] **7. polish**
  - dark mode pass, window drag + close
  - media keys / MPRIS work
  - measure RAM (~200MB target); try removing parts of Apple's DOM
  - done when: feels finished in daily use

- [ ] **8. package**
  - electron-builder AppImage
  - done when: AppImage runs outside the dev shell and plays music

## handoff notes

<!-- per step: what was done, gotchas, what's next (2-3 lines) -->

**-1:** AGENTS.md, dev CDP port 9222, playwright-cli for inspecting the app, `bun test`, `bun run check`.
Gotcha: agents can't launch Electron from their shell (zygote/GPU crash) - user runs `bun dev`, agent attaches. Next: step 0.
