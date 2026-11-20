import { describe, expect, test } from 'bun:test'
import { isAppleAuthUrl, isAppleMusicUrl } from './navigation'

describe('isAppleMusicUrl', () => {
  test('allows music.apple.com pages', () => {
    expect(isAppleMusicUrl('https://music.apple.com/')).toBe(true)
    expect(isAppleMusicUrl('https://music.apple.com/us/new?x=1')).toBe(true)
  })

  test('rejects other origins and lookalikes', () => {
    expect(isAppleMusicUrl('http://music.apple.com/')).toBe(false)
    expect(isAppleMusicUrl('https://apple.com/')).toBe(false)
    expect(isAppleMusicUrl('https://music.apple.com.evil.com/')).toBe(false)
    expect(isAppleMusicUrl('https://evil.com/?https://music.apple.com')).toBe(false)
  })

  test('rejects invalid urls', () => {
    expect(isAppleMusicUrl('not a url')).toBe(false)
    expect(isAppleMusicUrl('')).toBe(false)
  })
})

describe('isAppleAuthUrl', () => {
  test('allows apple sign-in hosts over https', () => {
    expect(isAppleAuthUrl('https://authorize.music.apple.com/woa?a=x&app=music')).toBe(true)
    expect(isAppleAuthUrl('https://idmsa.apple.com/appleauth/auth/signin')).toBe(true)
    expect(isAppleAuthUrl('https://appleid.apple.com/')).toBe(true)
    expect(isAppleAuthUrl('https://activate.apple.com/mkauth?jwtToken=x')).toBe(true)
    expect(isAppleAuthUrl('https://p22-buy.itunes.apple.com/commerce/account/validateMusicKitToken?Pod=22')).toBe(true)
    expect(isAppleAuthUrl('https://buy.itunes.apple.com/commerce/account/getMusicUserToken')).toBe(true)
  })

  test('rejects other hosts, http, ports and lookalikes', () => {
    expect(isAppleAuthUrl('http://authorize.music.apple.com/woa')).toBe(false)
    expect(isAppleAuthUrl('https://authorize.music.apple.com:8443/woa')).toBe(false)
    expect(isAppleAuthUrl('https://music.apple.com/')).toBe(false)
    expect(isAppleAuthUrl('https://www.apple.com/legal')).toBe(false)
    expect(isAppleAuthUrl('https://idmsa.apple.com.evil.com/')).toBe(false)
    expect(isAppleAuthUrl('https://evil.com/?https://idmsa.apple.com')).toBe(false)
    expect(isAppleAuthUrl('https://px-buy.itunes.apple.com/')).toBe(false)
    expect(isAppleAuthUrl('https://p22-buy.itunes.apple.com.evil.com/')).toBe(false)
    expect(isAppleAuthUrl('https://evilbuy.itunes.apple.com/')).toBe(false)
    expect(isAppleAuthUrl('about:blank')).toBe(false)
    expect(isAppleAuthUrl('not a url')).toBe(false)
  })
})
