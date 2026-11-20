import { describe, expect, test } from 'bun:test'
import { luminance, tintStyle, tintTokens } from './tint'

describe('luminance', () => {
  test('black, white and a mid grey', () => {
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#ffffff')).toBeCloseTo(1)
    expect(luminance('#777777')).toBeCloseTo(0.184, 2)
  })
})

describe('tintTokens', () => {
  test('dark artwork -> white text, play icon in the tint', () => {
    const t = tintTokens('#2b3334')!
    expect(t['--tint']).toBe('#2b3334')
    expect(t['--text']).toBe('#ffffff')
    expect(t['--play-fg']).toBe('#2b3334')
  })

  test('light artwork -> black text', () => {
    const t = tintTokens('#f0e6d2')!
    expect(t['--text']).toBe('#000000')
    expect(t['--play-fg']).toBe('#ffffff')
  })

  test('no or malformed colour -> no tint', () => {
    expect(tintTokens(undefined)).toBeUndefined()
    expect(tintTokens('2b3334')).toBeUndefined()
    expect(tintTokens('#2b33')).toBeUndefined()
    expect(tintStyle(undefined)).toBe('')
  })

  test('style string', () => {
    expect(tintStyle('#000000')).toStartWith('--tint: #000000; --text: #ffffff;')
  })
})
