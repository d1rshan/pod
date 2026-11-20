# ambient background (apple's lyrics view)

How music.apple.com draws the animated background behind lyrics, and what it would cost us.
Read from their bundle on 2026-11-20 (nothing copied into our code).

## where it lives

- the lyrics view lazy-loads a chunk `scene~<hash>.js` (hash changes per deploy) and runs
  `new LyricsScene(canvasEl, artworkURL)`, `scene.updateArtwork(url)`, `scene.destroy()`
- the chunk is ~250KB: PixiJS (2D WebGL) + pixi filters + the scene class

## the technique

the cover art itself, blurred into colour (not a palette):

1. 4 sprites of the cover, centred, sized 125% / 80% / 50% / 25% of the width
2. each rotates at its own speed and direction (+0.003, -0.008, -0.006, +0.004 rad per 33ms);
   the two smallest also orbit the centre at radius width/4
3. filters on the group, in order: twist (angle -3.25, radius 900, centred) -> blur 5, 10, 20,
   40, 80px -> adjustment (saturation 2.75, brightness 0.7, contrast 1.9)
4. overlays: 50% black, then 5% white
5. new artwork: a new set of 4 sprites cross-fades in over ~1.7s
6. limits: WebGL `powerPreference: 'low-power'`, ticker capped at 15fps, slower rotation with
   `prefers-reduced-motion`

## cost

- as apple built it: moderate. 250KB of code; every frame redoes the twist + 5 blur passes at full
  window size (several screen-size offscreen buffers, a few MB of GPU memory at 320x500). The 15fps
  cap keeps the ongoing load low.

## options for pod

- **A (chosen, `ui/artworkScene.ts` + `ArtworkScene.svelte`): same recipe on a tiny canvas.** 2D `<canvas>` at ~1/4 resolution (~80x125),
  apple's values as-is: 4 rotating covers, the twist done per pixel (cheap at this size),
  `ctx.filter` blur (~79px) + saturate/contrast/brightness in apple's order, the two overlays,
  15fps, stretched to full size with CSS (the blur hides the low resolution). Near zero CPU/GPU,
  ~1MB, no library. Only change: copies sized off the longer side in a tall window.
- **B: call apple's own `LyricsScene`.** Pixel-exact, almost no code, but the chunk name changes
  per deploy and it depends on apple's internals. Fragile; tried once for comparison only.
- **C: pure CSS** (4 rotating `<img>` under one `filter`). Simplest, but no fps cap: Chromium
  redoes a large blur at 60fps, so it costs more than A.

The twist reads pixels back, so the cover loads with CORS (mzstatic allows it; apple's scene does the same).
