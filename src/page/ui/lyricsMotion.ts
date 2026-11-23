// Motion of the lyrics view: apple's word fill, emphasis, instrumental dots and scroll easing
// (values from docs/lyrics.md), as pure functions of the playhead. Times in seconds.

export interface Timed {
  begin: number
  end: number
}

/** % of the soft edge of the word fill (the gradient runs from -EDGE% to 100%) */
export const FILL_EDGE = 20
/** px a word lifts while it's sung */
export const LIFT_PX = 2
/** s: the lift starts this long after the word */
export const LIFT_DELAY = 0.1
/** a syllable held this long (s) and at most `EMPHASIS_MAX_CHARS` long is sung letter by letter */
export const EMPHASIS_MIN_HOLD = 1
export const EMPHASIS_MAX_CHARS = 7
/** s: each half of an emphasised letter's swell */
export const EMPHASIS_HALF = 0.5
/** ms of the eased scroll to a new current line */
export const SCROLL_MS = 350
/** ms after the last user scroll before auto-scroll comes back */
export const USER_SCROLL_MS = 4500
/** s: a playhead jump bigger than this is a seek (re-scroll, back to auto) */
export const SEEK_JUMP = 1
/** s: an instrumental line's ending swell starts this long before the next line */
export const INSTRUMENTAL_ENDING = 1.5
/** opacity of an instrumental dot before it lights */
export const DOT_REST = 0.3

export const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x)

export const easeInOutQuad = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

/** 0..1 through `[begin, begin + duration]` (a zero-length span flips at `begin`) */
function through(t: number, begin: number, duration: number): number {
  return duration > 0 ? clamp01((t - begin) / duration) : t >= begin ? 1 : 0
}

export interface SyllableMotion {
  /** gradient position, % (-FILL_EDGE = unsung, 100 = sung) */
  fill: number
  /** px, negative = up */
  y: number
}

/** a plain syllable: linear fill over exactly its duration, eased lift from just after it starts */
export function syllableMotion(s: Timed, t: number): SyllableMotion {
  const d = s.end - s.begin
  return {
    fill: -FILL_EDGE + (100 + FILL_EDGE) * through(t, s.begin, d),
    y: -LIFT_PX * easeInOutQuad(through(t, s.begin + LIFT_DELAY, d))
  }
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

/** letters of an emphasised syllable, or undefined for a plain one */
export function emphasisLetters(s: Timed & { text: string }): string[] | undefined {
  const letters = [...s.text]
  if (s.end - s.begin < EMPHASIS_MIN_HOLD || letters.length > EMPHASIS_MAX_CHARS) return undefined
  if (!/\p{L}/u.test(s.text) || CJK.test(s.text)) return undefined
  return letters
}

export interface LetterMotion extends SyllableMotion {
  scale: number
  /** text-shadow blur, px */
  glow: number
  /** text-shadow opacity */
  glowAlpha: number
}

/**
 * Letter `i` of `n` in an emphasised syllable: starts `duration / n * i` in, swells for half a
 * second (scale up, lift, glow), then settles over the next half.
 */
export function letterMotion(s: Timed, i: number, n: number, t: number): LetterMotion {
  const start = s.begin + ((s.end - s.begin) / n) * i
  const a = through(t, start, EMPHASIS_HALF)
  const b = through(t, start + EMPHASIS_HALF, EMPHASIS_HALF)
  if (b <= 0) {
    const e = easeInOutQuad(a)
    return { fill: -FILL_EDGE + (90 + FILL_EDGE) * a, y: -2.05 * e, scale: 1 + 0.05 * e, glow: 10 * a, glowAlpha: 0.4 * a }
  }
  const e = easeInOutQuad(b)
  return { fill: 90 + 10 * b, y: -2.05 + 0.05 * e, scale: 1.05 - 0.05 * e, glow: 10 - 6 * b, glowAlpha: 0.4 - 0.4 * b }
}

/** dot `i` of 3 in an instrumental line: each lights in turn, the fade taking a third of the gap */
export function dotOpacity(line: Timed, i: number, t: number): number {
  const third = (line.end - line.begin) / 3
  return DOT_REST + (1 - DOT_REST) * through(t, line.begin + third * i, third)
}

/** scrollTop `elapsedMs` into an eased scroll from `from` to `to` */
export function scrollAt(from: number, to: number, elapsedMs: number): number {
  return from + (to - from) * easeInOutQuad(clamp01(elapsedMs / SCROLL_MS))
}
