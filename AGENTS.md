# pod

A tiny iPod-style Apple Music player for desktop. Intentionally limited: view playlists, search songs, play. Read-only, so there's no "add to library", favorites, or playlist editing.

**Before starting work, read `plan.md`** (private, git-ignored). It has the build order, the current step, and handoff notes from earlier sessions.

## How it works

- castLabs Electron (ships Widevine) loads `music.apple.com` and uses the page's own MusicKit instance (`MusicKit.getInstance()`). There's no Apple developer account or token.
- Apple's UI is hidden (`display: none`, not deleted). Our Svelte UI is injected on top in a Shadow DOM.
- The user signs in once through Apple's login popup. The session persists in the `persist:pod` partition.
- There's one small (320×500), frameless, always-on-top window.

## Stack

castLabs Electron, electron-vite, Svelte 5 (runes), TypeScript, bun. Linux first. Target ~200MB RAM.

## Code layout

```
src/
  main/      # electron: window, sign-in popup, inject UI
  preload/   # minimal contextBridge API (window controls)
  shared/    # cross-process types + pure helpers
  page/      # injected into music.apple.com
    music/   # the ONLY code that touches MusicKit
    state/   # svelte rune stores (*.svelte.ts)
    ui/      # screens/, components/, styles/tokens.css
scripts/     # dev tooling (inspect)
```

## Rules

- Data flows one way: ui → state → music → MusicKit. UI never calls MusicKit directly.
- `music/` maps Apple's data to our own types. Apple's shapes never leak outward.
- Talk to the MusicKit API only. Never scrape or click Apple's DOM.
- Navigation is tabs, each with its own small stack. No router, no state library, no UI kit.
- Keep main thin: windows and injection only. Use `contextIsolation`, no `nodeIntegration`, `sandbox: true`.
- Follow the design in Doop canvas `GPK_jqny4n` (doop MCP) and its style guide `pocket-fm-visual-language`.
- Name components `PascalCase.svelte` and modules `camelCase.ts`.

## Commands

```sh
nix develop --command bun dev   # run the app (NixOS: always inside the dev shell)
bun run check                   # typecheck + tests + build (run before every PR)
bun test                        # unit tests (*.test.ts next to the code)
bun run inspect <cmd>           # drive the RUNNING dev app over CDP (port 9222; runs on node - playwright hangs under bun)
```

`inspect` commands:
- `shot [file]`: screenshot (default `.inspect/shot.png`). Read the PNG to see it.
- `logs [s]`: reload and print console output and errors.
- `eval "<js>"`: evaluate JS in the page.
- `click "<css>"`: click an element. Locators pierce open shadow roots.
- `state`: MusicKit status (authorized, playback, now playing).

## Verifying your work

1. Run `bun run check`. It must pass.
2. Write unit tests for pure logic: data mappers, nav stack, formatting.
3. Run the app and check it with `bun run inspect`: take a screenshot after UI changes, check logs for errors, and check `state` for playback.
4. List what you could NOT verify (audio quality, feel) for the user's manual check.

Agents can't launch Electron from their own shell, because Chromium's zygote and GPU processes fail there. Ask the user to run `nix develop --command bun dev`, then attach with `inspect`. The running app carries the user's signed-in session. Never ask for Apple credentials.

## Workflow (one build step per session)

1. Read `plan.md` and find the current step.
2. Branch `step-N-name` off `main`.
3. Build frontend and backend together, in small commits.
4. Self-verify (above).
5. Open a PR.
6. The user runs `/code-review` in a fresh thread.
7. Fix the findings.
8. The user does a manual check.
9. Merge.
10. Tick the step in `plan.md` and add a 2-3 line handoff note.

## Environment notes

- NixOS: `flake.nix` dev shell points nix-ld at its own glibc and libs. Don't use `LD_LIBRARY_PATH`.
- The network is flaky: some npm and GitHub CDN IPs hang. Use timeouts on installs, and if one hangs, retry or ask the user to run it.
- If the castLabs binary is missing (`node_modules/electron/path.txt` should say `electron`), run `node node_modules/electron/install.js`.
- `plan.md` is private. Never commit it.
