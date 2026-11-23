# lyrics (apple's lyrics view)

How music.apple.com renders synced lyrics, so ours looks and moves the same.
Read from their bundle on 2026-11-23 (values only, nothing copied into our code).

## where it lives

- `<amp-lyrics>` web component in MusicKit's components bundle
  (`/includes/js-cdn/musickit/v3/components/musickit-components/`), Stencil, lazy chunks:
  `amp-lyrics` (fetch + state), `amp-lyrics-display-time-synced` (scroll), `amp-lyrics-display-synced-line`
  (one line + word animation), `amp-lyrics-display-instrumental-line` (the dots)
- the page sets the look through CSS custom properties on `amp-lyrics` (`--lyrics-line-*`, `--gradient-*`)

## data

- `GET /v1/catalog/{sf}/songs/{catalogId}/syllable-lyrics` -> TTML with per-word (syllable) timing:
  `<p begin end>` lines holding `<span begin end>` words; `ttm:agent` marks the singer (duets),
  `x-bg` spans are background vocals. 404 / errors = no lyrics
- songs without word timing come back line-timed only (whole line lights at once)
- library songs: use `playParams.catalogId` (same as the palette lookup)
- step 2 used `/lyrics` (line-timed); `syllable-lyrics` is what apple uses and is a superset

## layout + type (the mobile variant, closest to our window)

- font: SF Pro (`-apple-system`) **bold 700**, left aligned, `text-wrap` normal; we use Inter 700
- size 34px, line-height ~1.206; 32px side margins; 31px gap above each line (fullscreen uses 28px
  font + bottom gap 34px; same idea)
- colours on dark: lines `#ffffff2d` (white ~18%), current line white; hover on a non-current line ->
  white
- the list is masked: `linear-gradient(180deg, transparent, #000 40px, #000 50%, transparent)`, so lines
  fade in at the top edge and fade out over the lower half; scrollbar hidden
- the current line sits near the top: a 75px spacer above the first line, scroll target = current line
  minus 55px, a spacer below so the last line can reach that spot
- current line: `scale(var(--lyrics-current-line-scale))` (1 on mobile, 1.05 fullscreen),
  `transform-origin: left center`; transitions `color 0.1s, transform 0.1s ease-in-out`
- duets: the second singer's lines right aligned (origin right); background vocals smaller (22px)
  under the line, only shown on the current line

## the word fill (the signature effect)

- each word is painted with a text-clipped gradient (`background-clip: text`, fill transparent):
  `linear-gradient(to right, white @ alpha-active  <progress>, white @ alpha  <progress + 20%>)`
  -> a soft 20%-wide edge sweeping through the word. alpha-active 1, alpha 0.35 (mobile)
- per word, from its own begin/end (relative to the line's begin):
  - `--gradient-progress` -20% -> 100%, **linear**, over exactly the word's duration
  - the word lifts `translateY(0 -> -2px)`, eased, starting 0.1s after the word begins
- emphasis: a word held >= 1s and <= 7 characters is split into letters; letter i of n starts at
  `begin + duration/n * i`:
  - 0 -> 0.5s: scale 1 -> 1.05, y 0 -> -2.05px, gradient -20% -> 90%, glow
    `text-shadow 0 0 0->10px rgba(255,255,255, 0->0.4)`
  - 0.5s -> 1s: scale back to 1, y -2px, gradient 90% -> 100%, glow 10px -> 4px, opacity -> 0
- lines with no word timing: the whole line just takes the current colour

## past / future lines

- while auto-scrolling: every non-current line is blurred `2px` (`filter` transition 250ms linear);
  lines already sung fade to opacity 0 over 1s (linear) once the next line is current
- the first line is never blurred before it starts

## scrolling

- current line = the last line where `begin <= time + 250ms <= end` (a 250ms lookahead), else the line
  before the next one to start
- on a line change: scroll with **easeInOutQuad over 350ms** (rAF on `scrollTop`)
- a jump of > 1s in playback time (seek) snaps back to auto mode and re-scrolls
- user scroll (wheel / touch move): "user" mode -> no blur, sung lines fully visible, mask edges 80px
  at both ends; back to auto 4.5s after the last user scroll
- tap a line -> seek to its begin (instrumental lines aren't tappable)
- opening the view: jump straight to the current line, no animation

## instrumental gaps

- a gap of > 9s between lines (or before the first line) becomes a line of 3 dots
- dots 10px circles, 5px apart, left aligned; at rest opacity 0.3, each lights to 1 in turn, the
  fade lasting a third of the gap
- the group breathes: `scale 1 -> 1.2 -> 1`, 5s ease-in, infinite; in the last 1.5s `scale 1.1 -> 1.4`,
  1s ease-in
- collapsible: height 0 (scale 0.1) when not current; expands/collapses over 0.3s ease-in-out

## background

- the same artwork scene as Playing (docs/ambient.md); the lyrics column uses
  `mix-blend-mode: plus-lighter` so the white glows over the colour (normal blend on a near-white
  cover)

## options for pod

- **A (planned): our own Svelte lyrics view with the values above.** Parse the TTML into
  lines/words (pure, tested), render spans, drive `--gradient-progress` etc. from the player's time
  with one rAF loop (only the current line animates). Fits our layout and stores; no apple internals
- **B: drop apple's `<amp-lyrics>` into our shadow root.** Pixel-exact for free, but it reads the
  page's MusicKit + CSS context we don't control and changes with apple's deploys. Fallback if A
  can't get close
