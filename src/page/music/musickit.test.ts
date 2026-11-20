import { describe, expect, test } from 'bun:test'
import { isAuthorizationError, signIn, type MusicKitInstance } from './musickit'

const fakeMk = (authorize: () => Promise<void>, isAuthorized = false): MusicKitInstance => ({
  isAuthorized,
  authorize,
  addEventListener() {},
  removeEventListener() {}
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
