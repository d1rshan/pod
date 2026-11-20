import { describe, expect, test } from 'bun:test'
import { isAppleMusicUrl } from './navigation'

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
