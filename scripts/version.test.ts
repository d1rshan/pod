import { describe, expect, test } from 'bun:test'
import { isBump, nextVersion, parseTags } from './version'

describe('nextVersion', () => {
  test('patch / minor / major', () => {
    expect(nextVersion('0.0.1', 'patch', [])).toBe('0.0.2')
    expect(nextVersion('0.0.1', 'minor', [])).toBe('0.1.0')
    expect(nextVersion('0.1.3', 'major', [])).toBe('1.0.0')
  })

  test('explicit version', () => {
    expect(nextVersion('0.1.0', '0.3.0', [])).toBe('0.3.0')
    expect(() => nextVersion('0.1.0', '0.1.0', [])).toThrow("isn't after")
    expect(() => nextVersion('0.2.0', '0.1.9', [])).toThrow("isn't after")
    expect(nextVersion('0.9.0', '0.10.0', [])).toBe('0.10.0')
  })

  test('fails if the tag exists', () => {
    expect(() => nextVersion('0.0.1', 'minor', ['v0.0.1', 'v0.1.0'])).toThrow('v0.1.0 already exists')
  })

  test('bad input', () => {
    expect(() => nextVersion('0.0.1', 'huge', [])).toThrow('bump must be')
    expect(() => nextVersion('0.0.1', 'v1.0.0', [])).toThrow('bump must be')
    expect(() => nextVersion('0.0.1', '01.0.0', [])).toThrow('bump must be')
    expect(() => nextVersion('1.0', 'patch', [])).toThrow('not a version')
  })
})

test('isBump', () => {
  expect(['patch', 'minor', 'major', '1.2.3'].every(isBump)).toBe(true)
  expect(['', 'Patch', '1.2', '1.2.3-beta'].some(isBump)).toBe(false)
})

test('parseTags', () => {
  const lsRemote = 'abc123\trefs/tags/v0.1.0\ndef456\trefs/tags/v0.1.0^{}\n0aa\trefs/tags/v0.2.0\n'
  expect(parseTags(lsRemote)).toEqual(['v0.1.0', 'v0.1.0', 'v0.2.0'])
  expect(parseTags('v0.1.0\nv0.2.0\n')).toEqual(['v0.1.0', 'v0.2.0'])
  expect(parseTags('')).toEqual([])
})
