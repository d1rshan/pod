# AGENTS.md

- read `docs/spec.md` (what we're building) and `docs/progress.md` (current step + handoff notes) first

## commands

```sh
nix develop --command bun dev   # run the app (always inside the dev shell)
bun run check                   # typecheck + tests + build
bun test                        # unit tests (*.test.ts next to the code)
```

## inspecting the running app

- `playwright-cli` (installed globally) attaches to the dev app's CDP port `127.0.0.1:9222`
- the app uses the user's signed-in session - never ask for Apple credentials

```sh
# start it yourself if it isn't running (the agent shell needs these flags), in the background
nix develop --command bunx electron-vite dev --noSandbox -- --disable-gpu --no-zygote

export PLAYWRIGHT_CLI_SESSION=pod
playwright-cli attach --cdp=http://127.0.0.1:9222        # once; re-attach if the app restarts
playwright-cli snapshot                                   # page tree with refs (e3, ...)
playwright-cli click e3
playwright-cli screenshot --filename=.inspect/shot.png    # then read the PNG
playwright-cli console error                              # no reload needed
playwright-cli eval "() => window.MusicKit?.getInstance().playbackState"
```

## workflow (one step per session)

- take the next unticked step in `docs/progress.md`; work directly on `main`, no branches, no PRs
- build frontend + backend together, no intermediate commits
- verify -> run `/code-review` yourself in the same thread -> fix its findings -> re-verify -> user's manual check
- tick the step + 2-3 line handoff note in `docs/progress.md`
- only commit once user gives the permission: one commit per step (code + docs together)

update `docs/spec.md` only when a product/architecture decision changes

## verifying

- `bun run check` passes
- unit tests for pure logic (mappers, nav stack, formatting)
- after UI changes: snapshot/screenshot; check `console error`; `eval` for MusicKit state
- tell the user what you couldn't verify (audio, feel)

## conventions

- `PascalCase.svelte`, `camelCase.ts`, rune stores `*.svelte.ts`
- no new deps unless needed; plain CSS with tokens from `tokens.css`
- commit messages: lowercase only, short and informal (e.g. `add playlist screen`), no step numbers
