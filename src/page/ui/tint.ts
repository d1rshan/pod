// Playing screen colours from the artwork's background colour: the tint fills the window and
// the token overrides keep text, tabs, progress and buttons readable on top of it.

/** WCAG relative luminance of `#rrggbb` (0 = black, 1 = white) */
export function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/** white text keeps >= 3:1 contrast up to this luminance; above it we switch to black */
const LIGHT_TEXT_MAX = 0.3

const ON_DARK = {
  '--text': '#ffffff',
  '--text-secondary': 'rgba(255, 255, 255, 0.66)',
  '--bg-grouped': 'rgba(255, 255, 255, 0.13)',
  '--bg-selected': 'rgba(255, 255, 255, 0.2)',
  '--shadow-selected': 'none',
  '--track': 'rgba(255, 255, 255, 0.27)',
  '--progress': 'rgba(255, 255, 255, 0.92)',
  '--play-bg': 'rgba(255, 255, 255, 0.94)'
}

const ON_LIGHT = {
  '--text': '#000000',
  '--text-secondary': 'rgba(0, 0, 0, 0.58)',
  '--bg-grouped': 'rgba(0, 0, 0, 0.08)',
  '--bg-selected': 'rgba(255, 255, 255, 0.55)',
  '--shadow-selected': 'none',
  '--track': 'rgba(0, 0, 0, 0.18)',
  '--progress': 'rgba(0, 0, 0, 0.82)',
  '--play-bg': 'rgba(0, 0, 0, 0.88)'
}

/** CSS custom properties for a window tinted `color` (`#rrggbb`); undefined = no tint. */
export function tintTokens(color: string | undefined): Record<string, string> | undefined {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined
  const dark = luminance(color) <= LIGHT_TEXT_MAX
  return { '--tint': color, ...(dark ? ON_DARK : ON_LIGHT), '--play-fg': dark ? color : '#ffffff' }
}

/** `tintTokens` as an inline style string ('' = no tint) */
export function tintStyle(color: string | undefined): string {
  const tokens = tintTokens(color)
  return tokens
    ? Object.entries(tokens)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
    : ''
}
