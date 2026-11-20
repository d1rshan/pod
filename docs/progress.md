# progress

## build order (riskiest first)

each step = one session. "done when" = what the user checks before merging.

- [x] **-1. workflow setup**
  - AGENTS.md + CLAUDE.md, docs/spec.md + docs/progress.md
  - dev-only CDP port 9222, playwright-cli for inspecting the app
  - `bun test` + `bun run check`

- [x] **0. skeleton**
  - move `src/renderer` -> `src/page/` (`music/`, `state/`, `ui/`)
  - main loads `music.apple.com` (Chrome user-agent if Apple blocks Electron)
  - hide Apple's app root (`display: none`), inject our bundle, mount Svelte in a Shadow DOM
  - dev reload for the injected UI
  - `ui/styles/tokens.css` with light + dark vars from the canvas
  - done when: window shows our placeholder UI over the hidden Apple page; no console errors

- [x] **1. sign in + MusicKit ready**
  - wait for Widevine (castLabs `components.whenReady()`), then for `MusicKit.getInstance()`
  - sign in screen (canvas frame "Sign in") -> `authorize()`
  - allow Apple login popup (Apple auth domains only), deny other popups
  - session persisted in `persist:pod`
  - done when: sign in once, restart app, still signed in

- [x] **2. playback spike**
  - `music/player.ts`: play one hard-coded song
  - verify full-length playback (past 30s preview) via `eval` on playback time
  - quick check: can we fetch synced lyrics through the page's MusicKit?
  - done when: song plays audibly past 30s; lyrics feasibility noted below

- [x] **3. library + playlist detail**
  - tab bar (Playing / Library / Discover), per-tab nav stacks
  - `music/library.ts`: user's playlists, playlist tracks -> our types (+ tests)
  - `ListRow`, `Artwork`, `BackLink` components
  - tap a track -> play playlist from that track
  - done when: browse playlists, open one, tap a song and it plays

- [x] **4. playing screen**
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
  - window drag + close
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

**0:** main loads music.apple.com, injects `out/page/index.js` via `executeJavaScript` on dom-ready (window shown after), Apple's `body > *` hidden, Svelte in a shadow root. Page bundle is an IIFE built by a plugin in main's vite config (watched in dev, re-injected in place without reload). UA stripped of Electron/pod.
Gotcha: Apple's CSP allows inline styles + no Trusted Types, so Svelte `css: 'injected'` works in the shadow root. MusicKit is on `window` (main world). Next: step 1.

**1:** main waits for Widevine (capped 10s), allows only Apple auth popups (`isAppleAuthUrl`: authorize.music / activate / idmsa / appleid / `pNN-buy.itunes`), popup locked to those hosts. Page: `music/musickit.ts` (wait for instance, `authorize()`, auth events) -> `state/auth.svelte.ts` -> `screens/SignIn.svelte`.
Gotchas: window.open children ignore `session.setUserAgent` (Apple's popup rendered blank) - UA is stripped via `app.userAgentFallback`. Closing the popup rejects `authorize()` with `AUTHORIZATION_ERROR` (treated as cancel). Blocked popup navigations are logged as `[pod] blocked sign-in popup navigation`. Some accounts (India, `myacinfo-alt`) get `media-user-token` only on .authorize.music.apple.com -> auth/v2/web 403 -> MusicKit signs out; on popup close main copies those cookies to .apple.com and reloads (`signInCookies.ts`). Next: step 2.

**2:** `music/player.ts` (setQueue/play/pause/playback events) -> `state/player.svelte.ts` (spike: hard-coded Blinding Lights `1488408568`) -> placeholder buttons in `App.svelte`. Full track plays (40s+ of 3:22, `previewOnly: false`).
Gotcha: `setQueue` can outlast the click's user activation -> stuck in `loading`; main sets `autoplayPolicy: 'no-user-gesture-required'`. Lyrics: feasible - `mk.api.music('/v1/catalog/{sf}/songs/{id}/lyrics')` returns line-timed TTML (`<p begin end>`), `syncedLyrics` is 400; songs have `hasTimeSyncedLyrics`. Next: step 3.

**3:** `music/library.ts` (paged `/v1/me/library/playlists` + `/tracks`, follows `next`) -> `state/library.svelte.ts`; `state/navStack.ts` (pure tabs + stacks, re-tap tab = root) behind `state/nav.svelte.ts`; `TabBar`, `ListRow`, `Artwork`, `BackLink`, `Status`. Tap a track -> `setQueue({ playlist, startWith: i })`; if the queue item there isn't the tapped id, `changeToMediaAtIndex` to it. Scroll kept per stack entry. Playing/Discover tabs are placeholders.
Gotchas: `mk.api.music` resolves (doesn't throw) on non-2xx -> check `res.status`; 404 = empty. Generated playlist covers are fixed URLs (no `{w}x{h}`). Inter is inlined as a data: URL `@font-face` in the document head (CSP blocks Google Fonts; shadow roots ignore `@font-face`). Next: step 4.

**4:** `music/player.ts` gains now-playing (`queue.currentItem`, set before playback too), skip/seek (previous restarts past 3s), `currentIndex` -> `state/player.svelte.ts` (`current`, `position`, `playlistId`, `colors`). Playing screen + `ProgressBar` (range input) + `Transport`; `ui/ambient.ts` + `Ambient` paint the artwork palette (bg + text colours) as a wash plus drifting blobs on the screen, translucent tabs on top; cover shrinks when paused. App went dark only (one token set). Playlist highlight only while the queue is that playlist, nearest copy to the queue position; tapping it toggles.
Gotchas: the wash is the `.screen` background itself (a tinted child left a light seam at the rounded corners). Library songs have no artwork `bgColor` -> looked up via `/v1/catalog/{sf}/songs/{playParams.catalogId}` (cached; failures retried, 404 = none). A seek to an unbuffered spot takes seconds, and MusicKit keeps playing the old position meanwhile, so `seek` pauses, seeks, then resumes; the store holds the bar and button on the target until it lands. Next: step 5.
