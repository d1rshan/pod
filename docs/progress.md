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

- [x] **5. lyrics** (apple's lyrics view, docs/lyrics.md)
  - `music/lyrics.ts`: `syllable-lyrics` TTML -> lines + timed words, instrumental gaps (+ tests)
  - lyrics screen from Playing's lyrics button (no tab bar), over the same `ArtworkScene`
  - apple's look: bold left-aligned lines, word-by-word gradient fill + lift, emphasis glow on held
    words, blurred/faded other lines, eased scroll to the current line, instrumental dots
  - user scroll pauses auto-scroll (back after 4.5s); tap a line to seek
  - done when: lyrics fill word by word in sync and feel like apple's

- [x] **6. discover**
  - `music/search.ts`: catalog search, songs only
  - search field + result rows, empty state before searching
  - tap a result -> plays
  - done when: search a song, tap, it plays

- [x] **7. ram reduction**
  - cut memory as far as it goes without breaking sign-in, playback or the look; find where it goes
    and pick the approach yourself
  - confirm what you keep with `bun run bench` (~3 min, so only once an idea is worth confirming, not
    after every edit); keep only what beats the noise (~10MB)
  - known (bench baseline in `bench/results.jsonl`)
  - out of scope: replacing music.apple.com with a bare MusicKit page (architecture change, ask first)
  - done when: bench shows a clear drop and everything still works

- [ ] **8. package + release**
  - repo `d1rshan/pod` is already public; LICENSE: GPLv3 (same as d1rshan/tsuki), `license` in
    package.json
  - icon: 3-5 variants on the doop canvas (GPK_jqny4n): modern, minimal, our own music note on an
    ambient gradient like Playing's blurred cover glow (not Apple's icon: trademark) -> user picks
    one -> exported to `build/icon.png` (512 + 1024), used by the AppImage and the window
  - electron-builder: AppImage only (x86_64), `electronVersion` set explicitly (castLabs git dep),
    icon, `artifactName: pod-${arch}.${ext}` (stable name, so
    `releases/latest/download/pod-x86_64.AppImage` always gets the newest)
  - `.github/workflows/release.yml`: `workflow_dispatch` only, input `bump` = patch|minor|major|x.y.z;
    on ubuntu: install, next version (pure fn + tests, fails if the tag exists), `bun run check`,
    `bun run dist`, sha256 -> only then the bot (`github-actions[bot]`) commits `release vX.Y.Z` to
    main, tags `vX.Y.Z`, pushes, and publishes the GitHub release right away (no draft) with the
    AppImage + sha256 + generated notes; `concurrency` 1, `permissions: contents: write`
  - `scripts/release.ts`: `bun run release patch|minor|major|x.y.z`: checks on main, clean, pushed,
    `gh` signed in -> triggers the workflow (`gh workflow run`), watches it (`gh run watch`), prints
    the release URL, reminds to `git pull` (the bump commit is the bot's)
  - no update notice / self-update: updating = download the new AppImage, replace the file
    (sign-in lives in `~/.config/pod`, kept)
  - README: what pod is (needs an Apple Music subscription), a download badge (shields.io, shows
    the latest version) linking straight to `releases/latest/download/pod-x86_64.AppImage`, then
    install (`chmod +x`, run, sign in), update (replace the file), troubleshooting (libfuse2 on
    Ubuntu 22.04+, `--no-sandbox` on Ubuntu 24.04, `appimage-run` on NixOS), "not affiliated with
    Apple"
  - first release: 0.1.0 (`bun run release minor` from 0.0.1)
  - done when: v0.1.0 is published from CI; the AppImage from the README button runs outside the
    dev shell, signs in, plays full songs and shows the picked icon

## handoff notes

<!-- per step: what was done, gotchas, what's next (2-3 lines) -->

**-1:** AGENTS.md, dev CDP port 9222, playwright-cli for inspecting the app, `bun test`, `bun run check`.
Next: step 0.

**0:** main loads music.apple.com, injects `out/page/index.js` via `executeJavaScript` on dom-ready (window shown after), Apple's `body > *` hidden, Svelte in a shadow root. Page bundle is an IIFE built by a plugin in main's vite config (watched in dev, re-injected in place without reload). UA stripped of Electron/pod.
Gotcha: Apple's CSP allows inline styles + no Trusted Types, so Svelte `css: 'injected'` works in the shadow root. MusicKit is on `window` (main world). Next: step 1.

**1:** main waits for Widevine (capped 10s), allows only Apple auth popups (`isAppleAuthUrl`: authorize.music / activate / idmsa / appleid / `pNN-buy.itunes`), popup locked to those hosts. Page: `music/musickit.ts` (wait for instance, `authorize()`, auth events) -> `state/auth.svelte.ts` -> `screens/SignIn.svelte`.
Gotchas: window.open children ignore `session.setUserAgent` (Apple's popup rendered blank) - UA is stripped via `app.userAgentFallback`. Closing the popup rejects `authorize()` with `AUTHORIZATION_ERROR` (treated as cancel). Blocked popup navigations are logged as `[pod] blocked sign-in popup navigation`. Some accounts (India, `myacinfo-alt`) get `media-user-token` only on .authorize.music.apple.com -> auth/v2/web 403 -> MusicKit signs out; on popup close main copies those cookies to .apple.com and reloads (`signInCookies.ts`). Next: step 2.

**2:** `music/player.ts` (setQueue/play/pause/playback events) -> `state/player.svelte.ts` (spike: hard-coded Blinding Lights `1488408568`) -> placeholder buttons in `App.svelte`. Full track plays (40s+ of 3:22, `previewOnly: false`).
Gotcha: `setQueue` can outlast the click's user activation -> stuck in `loading`; main sets `autoplayPolicy: 'no-user-gesture-required'`. Lyrics: feasible - `mk.api.music('/v1/catalog/{sf}/songs/{id}/lyrics')` returns line-timed TTML (`<p begin end>`), `syncedLyrics` is 400; songs have `hasTimeSyncedLyrics`. Next: step 3.

**3:** `music/library.ts` (paged `/v1/me/library/playlists` + `/tracks`, follows `next`) -> `state/library.svelte.ts`; `state/navStack.ts` (pure tabs + stacks, re-tap tab = root) behind `state/nav.svelte.ts`; `TabBar`, `ListRow`, `Artwork`, `BackLink`, `Status`. Tap a track -> `setQueue({ playlist, startWith: i })`; if the queue item there isn't the tapped id, `changeToMediaAtIndex` to it. Scroll kept per stack entry. Playing/Discover tabs are placeholders.
Gotchas: `mk.api.music` resolves (doesn't throw) on non-2xx -> check `res.status`; 404 = empty. Generated playlist covers are fixed URLs (no `{w}x{h}`). Inter is inlined as a data: URL `@font-face` in the document head (CSP blocks Google Fonts; shadow roots ignore `@font-face`). Next: step 4.

**4:** `music/player.ts` gains now-playing (`queue.currentItem`, set before playback too), skip/seek (previous restarts past 3s), `currentIndex` -> `state/player.svelte.ts` (`current`, `position`, `playlistId`, `colors`). Playing screen + `ProgressBar` (range input) + `Transport`; `ArtworkScene` (`ui/artworkScene.ts`, docs/ambient.md) draws the cover rotating and blurred on a 1/4-res canvas at 15fps over a wash of its bg colour, translucent tabs on top; cover shrinks when paused. App went dark only (one token set). Playlist highlight only while the queue is that playlist, nearest copy to the queue position; tapping it toggles.
Gotchas: the wash is the `.screen` background itself (a tinted child left a light seam at the rounded corners). Library songs have no artwork `bgColor` -> looked up via `/v1/catalog/{sf}/songs/{playParams.catalogId}` (cached; failures retried, 404 = none). A seek to an unbuffered spot takes seconds, and MusicKit keeps playing the old position meanwhile, so `seek` pauses, seeks, then resumes; the store holds the bar and button on the target until it lands. Next: step 5.

**5:** `music/lyrics.ts` (own tiny XML reader -> lines of timed syllables, bg vocals, duet agents, instrumental gaps, `currentLine`/`activeLines`) -> `state/lyrics.svelte.ts` (fetched per song, cached; dims Playing's lyrics button when none) -> `screens/Lyrics.svelte` + `components/LyricsView.svelte` (one rAF loop writes `--fill`/`--y` on the active lines only; motion maths in `ui/lyricsMotion.ts`). Apple's values scaled to our window (22px type, current line 36px from the top).
Gotchas: `currentPlaybackTime` is whole seconds -> `preciseTime` reads `audio#apple-music-player`. After a song change MusicKit reports the old song's time for a moment -> the player store ignores times > 2s for 2s (else the lyrics/bar flash). Catalog queue items have no `playParams.catalogId` (their id is it). Hover highlight only in user-scroll mode. Next: step 6.

**6:** `music/search.ts` (`/v1/catalog/{sf}/search`, `types=songs`, 25 max, + tests) -> `state/search.svelte.ts` (debounced 350ms, enter = now, kept across tab switches, cleared on sign-out) -> `screens/Discover.svelte` (field, empty/no-results/error states, result rows). Tap = `player.playSong` (queue of that one song); the playing result is highlighted with the shared `RowToggle` (also used by Playlist).
Gotcha: Apple's page shortcuts saw our keys retargeted to the shadow host and ate spaces in the field -> `index.ts` stops key events at the host (Apple's handler bubbles). Next: step 7.

**7:** Apple's hidden home page was the cost (13 MSE motion videos, ~90 images, 4.8k nodes, growing over time). Main now loads `/{sf}/pod` (`shared/parked.ts`, a 404 that still boots Apple's shell + MusicKit); bench idle 549->360, playing 660->481, lyrics 808->498 MB (renderer 306->123). Storefront saved in `userData/storefront`; `auth.svelte.ts` re-parks (`location.replace`, max 3 per tab session) when the account's differs.
Gotchas: MusicKit takes `storefrontId` from the URL, and a storefront that isn't the account's = `previewOnly` (stops at 90s). Tried, no gain over noise: audio service in-process (~7MB), V8 semi-space / optimize-for-size; network service in-process broke loading. Left: main ~115, CDM ~100, GPU ~70 (Chromium/Apple shell baseline). Apple logs its own 404 twice (expected). How it was found: CDP `Tracing` with `disabled-by-default-memory-infra` + `requestMemoryDump` (per-process allocator breakdown: media/cc image memory pointed at Apple's videos/images). Next: step 8.
