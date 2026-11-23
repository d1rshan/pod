// Apple's page is parked on a not-found route, `/{storefront}/pod`: MusicKit and Apple's app shell
// load, none of Apple's catalog pages do (the home page alone keeps motion-artwork videos and ~100
// images in memory). The storefront segment has to be the account's: MusicKit takes its storefront
// from the URL, and on a mismatch it plays previews only.

const PARKED_PAGE = 'pod'
/** what MusicKit falls back to without one */
export const DEFAULT_STOREFRONT = 'us'
const STOREFRONT = /^[a-z]{2}$/

/** `/in/pod` (the default storefront for anything that isn't one) */
export function parkedPath(storefront: string): string {
  return `/${isStorefront(storefront) ? storefront : DEFAULT_STOREFRONT}/${PARKED_PAGE}`
}

/** `/in/pod` -> `in`; undefined for any other path */
export function parkedStorefront(path: string): string | undefined {
  const [, sf, page, ...rest] = path.split('/')
  return sf && isStorefront(sf) && page === PARKED_PAGE && rest.length === 0 ? sf : undefined
}

export function isStorefront(s: string): boolean {
  return STOREFRONT.test(s)
}
