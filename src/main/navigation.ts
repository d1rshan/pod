export const APPLE_MUSIC_ORIGIN = 'https://music.apple.com'

/** True only for pages on music.apple.com (the one site the main window may show). */
export function isAppleMusicUrl(url: string): boolean {
  try {
    return new URL(url).origin === APPLE_MUSIC_ORIGIN
  } catch {
    return false
  }
}
