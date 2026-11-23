import { describe, expect, test } from 'bun:test'
import { isStorefront, parkedPath, parkedStorefront } from './parked'

describe('parkedPath', () => {
  test('puts the storefront in front', () => {
    expect(parkedPath('in')).toBe('/in/pod')
  })
  test('falls back to us for anything else', () => {
    expect(parkedPath('')).toBe('/us/pod')
    expect(parkedPath('../x')).toBe('/us/pod')
    expect(parkedPath('IN')).toBe('/us/pod')
  })
})

describe('parkedStorefront', () => {
  test('reads it back', () => {
    expect(parkedStorefront('/in/pod')).toBe('in')
    expect(parkedStorefront(parkedPath('jp'))).toBe('jp')
  })
  test('ignores other pages', () => {
    expect(parkedStorefront('/in/home')).toBeUndefined()
    expect(parkedStorefront('/pod')).toBeUndefined()
    expect(parkedStorefront('/in/pod/x')).toBeUndefined()
    expect(parkedStorefront('/')).toBeUndefined()
  })
})

test('isStorefront', () => {
  expect(isStorefront('in')).toBe(true)
  expect(isStorefront('usa')).toBe(false)
})
