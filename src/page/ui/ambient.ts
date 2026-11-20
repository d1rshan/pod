// Colours for the Playing screen's moving background, from the artwork's palette.
import type { ArtworkColors } from '../music/types'

/** base wash + three blob colours */
export type AmbientPalette = readonly [base: string, string, string, string]

/** The base is the cover's background; blobs mix in its text colours (repeating when there are fewer). */
export function ambientPalette(colors: ArtworkColors | undefined): AmbientPalette | undefined {
  if (!colors) return undefined
  const pick = (i: number): string => colors.text[i % (colors.text.length || 1)] ?? colors.bg
  return [colors.bg, pick(0), colors.bg, pick(1)]
}

/** The palette as CSS custom properties `--ambient-0..3` */
export function ambientStyle(palette: AmbientPalette): string {
  return palette.map((c, i) => `--ambient-${i}: ${c}`).join('; ')
}
