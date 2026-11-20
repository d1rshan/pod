import { describe, expect, test } from 'bun:test'
import { advance, fadeProgress, FADE_MS, layout, REDUCED_SPEED, SPEEDS, twist, type Angles } from './artworkScene'

const zero: Angles = [0, 0, 0, 0]

describe('advance', () => {
  test("turns each copy at apple's speeds (per 1/30s)", () => {
    const a = advance(zero, 1000 / 30)
    a.forEach((v, i) => expect(v).toBeCloseTo(SPEEDS[i as 0]))
    expect(advance(zero, 1000)[1]).toBeCloseTo(SPEEDS[1] * 30)
  })

  test('reduced motion: all slow, same direction', () => {
    for (const v of advance(zero, 1000 / 30, true)) expect(v).toBeCloseTo(REDUCED_SPEED)
  })
})

describe('layout', () => {
  test('sizes off the longer side; the biggest covers the corners at any angle', () => {
    const [big, mid, small, tiny] = layout(80, 125, zero)
    expect([big!.size, mid!.size, small!.size, tiny!.size]).toEqual([156.25, 100, 62.5, 31.25])
    // inscribed circle of the big square vs half the diagonal
    expect(big!.size / 2).toBeGreaterThan(Math.hypot(40, 62.5))
    expect([big!.x, big!.y]).toEqual([40, 62.5])
  })

  test('the small copies orbit the centre, counter-rotating', () => {
    const angles: Angles = [0, 0, (Math.PI / 2) / 0.75, 0]
    const small = layout(80, 125, angles)[2]!
    expect(small.x).toBeCloseTo(40)
    expect(small.y).toBeCloseTo(62.5 + 20)
    expect(small.rotation).toBeCloseTo(-angles[2])
  })
})

describe('twist', () => {
  // 4x1 strip of distinct pixels (r = index)
  const strip = (): Uint8ClampedArray => new Uint8ClampedArray([0, 0, 0, 255, 1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255])

  test('no angle (or outside the radius) copies the pixels', () => {
    const out = new Uint8ClampedArray(16)
    twist(strip(), out, 4, 1, 2, 0.5, 10, 0)
    expect([...out]).toEqual([...strip()])
    twist(strip(), out, 4, 1, 2, 0.5, 0.1, 3)
    expect([...out]).toEqual([...strip()])
  })

  test('a half turn at the centre mirrors pixels around it; off-image samples are transparent', () => {
    const out = new Uint8ClampedArray(16)
    const reds = (): number[] => [0, 1, 2, 3].map((i) => out[i * 4]!)
    // huge radius -> the full angle everywhere: a half turn about x = 2 reverses the strip
    twist(strip(), out, 4, 1, 2, 0.5, 1e9, Math.PI)
    expect(reds()).toEqual([3, 2, 1, 0])
    // about x = 0, pixels right of it would sample left of the image
    twist(strip(), out, 4, 1, 0, 0.5, 1e9, Math.PI)
    expect(out[3 * 4 + 3]).toBe(0)
  })

  test('fade clamps to 0..1', () => {
    expect(fadeProgress(0, 100)).toBe(0)
    expect(fadeProgress(100 + FADE_MS / 2, 100)).toBeCloseTo(0.5)
    expect(fadeProgress(1e9, 100)).toBe(1)
  })
})
