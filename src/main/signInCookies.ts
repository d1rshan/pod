// Workaround for Apple's sign-in leaving the session cookies on the wrong domain.
// Some sign-in paths (seen with an India account, `myacinfo-alt` on idmsa) set
// media-user-token & co only on .authorize.music.apple.com / .mediaauth.apple.com.
// music.apple.com can't see them, its auth/v2/web reflection 403s and MusicKit
// signs straight back out. Copying them to .apple.com fixes it; after a reload
// MusicKit refreshes them onto .music.apple.com itself.
// https://github.com/megarohas/apple-music-android-tv/issues/2

export const SIGN_IN_COOKIE_SOURCE = 'https://authorize.music.apple.com/'
export const SIGN_IN_COOKIE_TARGET = 'https://music.apple.com/'
export const SIGN_IN_COOKIE_DOMAIN = '.apple.com'

const USER_TOKEN = 'media-user-token'
const SESSION_COOKIES = [USER_TOKEN, 'itre', 'itspod', 'itua', 'pldfltcid', 'pltvcid']

export interface CookieLike {
  name: string
  value: string
}

/**
 * Which cookies to copy from the authorize domain to music.apple.com: none if
 * music.apple.com already sees a user token (normal sign-in), else the session
 * cookies it lacks. Empty unless the source actually has a user token.
 */
export function cookiesToAdopt<T extends CookieLike>(source: T[], target: CookieLike[]): T[] {
  const has = (list: CookieLike[], name: string): boolean =>
    list.some((c) => c.name === name && c.value !== '')
  if (has(target, USER_TOKEN) || !has(source, USER_TOKEN)) return []
  return SESSION_COOKIES.flatMap((name) => {
    if (has(target, name)) return []
    const cookie = source.find((c) => c.name === name && c.value !== '')
    return cookie ? [cookie] : []
  })
}
