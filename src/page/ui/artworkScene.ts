// The Playing background: the cover art itself, rotating and blurred into colour (the
// recipe of Apple's lyrics view, see docs/ambient.md), drawn small on a 2D canvas.

/** rotation speeds of the 4 cover copies, radians per 1/30s (apple's values) */
export const SPEEDS = [0.003, -0.008, -0.006, 0.004] as const
/** with prefers-reduced-motion: every copy turns this slowly */
export const REDUCED_SPEED = 0.001
const SPEED_UNIT_MS = 1000 / 30

/** redraws per second (the blur hides the steps) */
export const FPS = 15
/** canvas pixels per CSS pixel: the result is blurred to mush anyway, CSS scales it up */
export const RESOLUTION = 0.25
/** CSS px: apple's stacked blurs (5, 10, 20, 40, 80 at quality 1/1/2/2/2) add up to about this */
export const BLUR = 79
/** apple's twist: swirls everything within `radius` CSS px of the centre, `angle` at the centre */
export const TWIST = { angle: -3.25, radius: 900 }
/** colour boost after the blur, in apple's order (saturation, contrast, brightness) */
export const ADJUST = 'saturate(2.75) contrast(1.9) brightness(0.7)'
/** overlays after that: darken, then a slight lift */
export const SHADE = 'rgba(0, 0, 0, 0.5)'
export const LIFT = 'rgba(255, 255, 255, 0.05)'
/** ms for a new cover to cross-fade in */
export const FADE_MS = 1700

export type Angles = readonly [number, number, number, number]

export interface Sprite {
  x: number
  y: number
  size: number
  rotation: number
}

/** angles after `dtMs` */
export function advance(angles: Angles, dtMs: number, reducedMotion = false): Angles {
  const k = dtMs / SPEED_UNIT_MS
  const step = (i: 0 | 1 | 2 | 3): number => angles[i] + (reducedMotion ? REDUCED_SPEED : SPEEDS[i]) * k
  return [step(0), step(1), step(2), step(3)]
}

/**
 * The 4 copies for a `w`x`h` area: 125% / 80% / 50% / 25% of the width as apple does, but of the
 * longer side when the area is taller than wide (else the copies leave the top and bottom bare);
 * the two small ones orbit the centre at a quarter of the width.
 */
export function layout(w: number, h: number, angles: Angles): Sprite[] {
  const base = Math.max(w, h)
  const cx = w / 2
  const cy = h / 2
  const orbit = w / 4
  const [a0, a1, a2, a3] = angles
  return [
    { x: cx, y: cy, size: base * 1.25, rotation: a0 },
    { x: w / 2.5, y: h / 2.5, size: base * 0.8, rotation: a1 },
    { x: cx + orbit * Math.cos(a2 * 0.75), y: cy + orbit * Math.sin(a2 * 0.75), size: base * 0.5, rotation: -a2 },
    {
      x: cx + w * 0.05 + orbit * Math.cos(a3 * 0.75),
      y: cy + w * 0.05 + orbit * Math.sin(a3 * 0.75),
      size: base * 0.25,
      rotation: -a3
    }
  ]
}

/**
 * Apple's twist filter on RGBA pixels: each output pixel samples the source rotated about
 * (`cx`, `cy`) by `angle * ((radius - dist) / radius)^2` (nearest pixel; it gets blurred anyway).
 */
export function twist(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
  angle: number
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = x
      let sy = y
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dist = Math.hypot(dx, dy)
      if (dist < radius) {
        const r = (radius - dist) / radius
        const a = r * r * angle
        const c = Math.cos(a)
        const s = Math.sin(a)
        sx = Math.floor(cx + dx * c - dy * s)
        sy = Math.floor(cy + dx * s + dy * c)
      }
      const o = (y * w + x) * 4
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
        dst[o] = dst[o + 1] = dst[o + 2] = dst[o + 3] = 0
        continue
      }
      const i = (sy * w + sx) * 4
      dst[o] = src[i]!
      dst[o + 1] = src[i + 1]!
      dst[o + 2] = src[i + 2]!
      dst[o + 3] = src[i + 3]!
    }
  }
}

/** 0..1 progress of a cross-fade that started at `start` */
export function fadeProgress(now: number, start: number): number {
  return Math.min(1, Math.max(0, (now - start) / FADE_MS))
}
