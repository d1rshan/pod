import { describe, expect, test } from 'bun:test'
import { formatTime } from './format'

describe('formatTime', () => {
  test('formats minutes and seconds', () => {
    expect(formatTime(102)).toBe('1:42')
    expect(formatTime(320)).toBe('5:20')
    expect(formatTime(5)).toBe('0:05')
  })

  test('floors fractional seconds', () => {
    expect(formatTime(59.9)).toBe('0:59')
  })

  test('handles invalid input', () => {
    expect(formatTime(-1)).toBe('0:00')
    expect(formatTime(Number.NaN)).toBe('0:00')
  })
})
