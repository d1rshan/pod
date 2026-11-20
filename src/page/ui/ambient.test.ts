import { describe, expect, test } from 'bun:test'
import { ambientPalette, ambientStyle } from './ambient'

describe('ambientPalette', () => {
  test('base from the background, blobs from the text colours and the background', () => {
    expect(ambientPalette({ bg: '#2b3334', text: ['#dfb8ac', '#e8b49f', '#bb9d94'] })).toEqual([
      '#2b3334',
      '#dfb8ac',
      '#2b3334',
      '#e8b49f'
    ])
  })

  test('repeats a single text colour, falls back to the background without any', () => {
    expect(ambientPalette({ bg: '#111111', text: ['#eeeeee'] })).toEqual(['#111111', '#eeeeee', '#111111', '#eeeeee'])
    expect(ambientPalette({ bg: '#111111', text: [] })).toEqual(['#111111', '#111111', '#111111', '#111111'])
  })

  test('no palette -> none', () => {
    expect(ambientPalette(undefined)).toBeUndefined()
  })
})

describe('ambientStyle', () => {
  test('custom properties', () => {
    expect(ambientStyle(['#000000', '#111111', '#222222', '#333333'])).toBe(
      '--ambient-0: #000000; --ambient-1: #111111; --ambient-2: #222222; --ambient-3: #333333'
    )
  })
})
