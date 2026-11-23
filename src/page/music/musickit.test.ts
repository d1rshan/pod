import { describe, expect, test } from 'bun:test'
import { accountStorefront, isAuthorizationError, signIn, type MusicKitInstance } from './musickit'

const fakeMk = (authorize: () => Promise<void>, isAuthorized = false): MusicKitInstance => ({
  isAuthorized,
  authorize,
  playbackState: 0,
  currentPlaybackTime: 0,
  currentPlaybackDuration: 0,
  setQueue: async () => {},
  play: async () => {},
  pause() {},
  addEventListener() {},
  removeEventListener() {},
  api: { music: async () => ({ status: 200, data: {} }) },
  queue: { items: [], position: 0 },
  changeToMediaAtIndex: async () => {},
  skipToNextItem: async () => {},
  skipToPreviousItem: async () => {},
  seekToTime: async () => {},
  storefrontId: 'us'
})

describe('isAuthorizationError', () => {
  test('matches MusicKit authorization errors only', () => {
    expect(isAuthorizationError({ errorCode: 'AUTHORIZATION_ERROR' })).toBe(true)
    expect(isAuthorizationError({ errorCode: 'NETWORK_ERROR' })).toBe(false)
    expect(isAuthorizationError(new Error('x'))).toBe(false)
    expect(isAuthorizationError(null)).toBe(false)
    expect(isAuthorizationError(undefined)).toBe(false)
  })
})

describe('signIn', () => {
  test('resolves with the authorized state', async () => {
    expect(await signIn(fakeMk(async () => {}, true))).toBe(true)
  })

  test('closing the popup (authorization error) resolves false', async () => {
    const mk = fakeMk(() => Promise.reject({ errorCode: 'AUTHORIZATION_ERROR' }))
    expect(await signIn(mk)).toBe(false)
  })

  test('other failures reject', async () => {
    const mk = fakeMk(() => Promise.reject(new Error('network down')))
    await expect(signIn(mk)).rejects.toThrow('network down')
  })
})

describe('accountStorefront', () => {
  test('the signed-in user storefront, lowercased', () => {
    expect(accountStorefront({ ...fakeMk(async () => {}, true), storefrontCountryCode: 'IN' })).toBe('in')
  })
  test('undefined when signed out or unknown', () => {
    expect(accountStorefront({ ...fakeMk(async () => {}), storefrontCountryCode: 'in' })).toBeUndefined()
    expect(accountStorefront(fakeMk(async () => {}, true))).toBeUndefined()
  })
})
