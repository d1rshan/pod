import { describe, expect, test } from 'bun:test'
import { dotOpacity, easeInOutQuad, emphasisLetters, letterMotion, scrollAt, SCROLL_MS, syllableMotion } from './lyricsMotion'

describe('easeInOutQuad', () => {
  test('ends and middle', () => {
    expect(easeInOutQuad(0)).toBe(0)
    expect(easeInOutQuad(0.5)).toBe(0.5)
    expect(easeInOutQuad(1)).toBe(1)
    expect(easeInOutQuad(0.25)).toBeLessThan(0.25)
  })
})

describe('syllableMotion', () => {
  const s = { begin: 10, end: 11 }
  test('unsung before, sung after', () => {
    expect(syllableMotion(s, 9)).toEqual({ fill: -20, y: -0 })
    expect(syllableMotion(s, 12)).toEqual({ fill: 100, y: -2 })
  })
  test('fill is linear over the duration; the lift lags 0.1s', () => {
    const m = syllableMotion(s, 10.5)
    expect(m.fill).toBeCloseTo(40)
    expect(m.y).toBeCloseTo(-2 * easeInOutQuad(0.4))
    expect(syllableMotion(s, 10.05).y).toBe(-0)
  })
  test('zero-length syllables flip at their start', () => {
    expect(syllableMotion({ begin: 5, end: 5 }, 4.9).fill).toBe(-20)
    expect(syllableMotion({ begin: 5, end: 5 }, 5).fill).toBe(100)
  })
})

describe('emphasisLetters', () => {
  test('long-held short words are split into letters', () => {
    expect(emphasisLetters({ text: 'baby', begin: 0, end: 1.2 })).toEqual(['b', 'a', 'b', 'y'])
  })
  test('short holds, long words, no letters, CJK stay plain', () => {
    expect(emphasisLetters({ text: 'baby', begin: 0, end: 0.9 })).toBeUndefined()
    expect(emphasisLetters({ text: 'tomorrow', begin: 0, end: 3 })).toBeUndefined()
    expect(emphasisLetters({ text: '...', begin: 0, end: 3 })).toBeUndefined()
    expect(emphasisLetters({ text: '夜', begin: 0, end: 3 })).toBeUndefined()
  })
})

describe('letterMotion', () => {
  const s = { begin: 0, end: 2 } // 4 letters: each starts 0.5s after the one before
  test('rest before its turn', () => {
    expect(letterMotion(s, 1, 4, 0.4)).toEqual({ fill: -20, y: -0, scale: 1, glow: 0, glowAlpha: 0 })
  })
  test('peak at half a second in', () => {
    const m = letterMotion(s, 1, 4, 1)
    expect(m.fill).toBeCloseTo(90)
    expect(m.scale).toBeCloseTo(1.05)
    expect(m.y).toBeCloseTo(-2.05)
    expect(m.glow).toBeCloseTo(10)
    expect(m.glowAlpha).toBeCloseTo(0.4)
  })
  test('settled a second in', () => {
    const m = letterMotion(s, 1, 4, 1.5)
    expect(m.fill).toBeCloseTo(100)
    expect(m.scale).toBeCloseTo(1)
    expect(m.y).toBeCloseTo(-2)
    expect(m.glow).toBeCloseTo(4)
    expect(m.glowAlpha).toBeCloseTo(0)
  })
})

describe('dotOpacity', () => {
  const gap = { begin: 0, end: 30 }
  test('each dot lights over its third', () => {
    expect(dotOpacity(gap, 0, 0)).toBeCloseTo(0.3)
    expect(dotOpacity(gap, 0, 5)).toBeCloseTo(0.65)
    expect(dotOpacity(gap, 0, 10)).toBeCloseTo(1)
    expect(dotOpacity(gap, 2, 15)).toBeCloseTo(0.3)
    expect(dotOpacity(gap, 2, 30)).toBeCloseTo(1)
  })
})

describe('scrollAt', () => {
  test('eases from start to target', () => {
    expect(scrollAt(100, 300, 0)).toBe(100)
    expect(scrollAt(100, 300, SCROLL_MS / 2)).toBe(200)
    expect(scrollAt(100, 300, SCROLL_MS * 2)).toBe(300)
  })
})
