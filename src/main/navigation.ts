export const APPLE_MUSIC_ORIGIN = 'https://music.apple.com'

/** True only for pages on music.apple.com (the one site the main window may show). */
export function isAppleMusicUrl(url: string): boolean {
  try {
    return new URL(url).origin === APPLE_MUSIC_ORIGIN
  } catch {
    return false
  }
}

/** Hosts Apple's sign-in popup (opened by MusicKit `authorize()`) may load. */
const APPLE_AUTH_HOSTS = new Set([
  'authorize.music.apple.com',
  'activate.apple.com',
  'idmsa.apple.com',
  'appleid.apple.com'
])

/** Apple's store pods, where sign-in lands after 2FA (`p22-buy.itunes.apple.com/commerce/...`). */
const APPLE_STORE_HOST = /^(p\d+-)?buy\.itunes\.apple\.com$/

/** True for https pages on Apple's sign-in hosts: the only popups we allow. */
export function isAppleAuthUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.port !== '') return false
    return APPLE_AUTH_HOSTS.has(u.hostname) || APPLE_STORE_HOST.test(u.hostname)
  } catch {
    return false
  }
}
