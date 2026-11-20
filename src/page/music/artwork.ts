/**
 * Apple artwork template -> URL for a square image of `px` pixels.
 * Templates look like `.../{w}x{h}bb.jpg` (sometimes `{c}`/`{f}`); generated
 * playlist covers are fixed-size URLs with no placeholders and pass through.
 */
export function artworkUrl(template: string, px: number): string {
  const size = String(Math.round(px))
  return template
    .replace('{w}', size)
    .replace('{h}', size)
    .replace('{c}', 'bb')
    .replace('{f}', 'jpg')
}
