import { expect, test } from 'bun:test'
import { vmpHook, vmpSign } from './vmp.cjs'

test('macOS signs before code signing, Windows after, Linux never', () => {
  expect(vmpHook('darwin')).toBe('afterPack')
  expect(vmpHook('win32')).toBe('afterSign')
  expect(vmpHook('linux')).toBeNull()
})

test('other stages are a no-op', () => {
  // would spawn python (and throw) if it tried to sign
  expect(() => vmpSign('afterSign', { electronPlatformName: 'darwin', appOutDir: '/x' })).not.toThrow()
  expect(() => vmpSign('afterPack', { electronPlatformName: 'win32', appOutDir: 'C:\\x' })).not.toThrow()
  expect(() => vmpSign('afterPack', { electronPlatformName: 'linux', appOutDir: '/x' })).not.toThrow()
})

// `true`/`false` as a stand-in python (not on Windows' PATH)
test.skipIf(process.platform === 'win32')('the platform stage signs then verifies, and a failing evs fails the build', () => {
  const ctx = { electronPlatformName: 'darwin', appOutDir: '/x' }
  const saved = process.env.PYTHON
  try {
    process.env.PYTHON = 'true'
    expect(() => vmpSign('afterPack', ctx)).not.toThrow()
    process.env.PYTHON = 'false'
    expect(() => vmpSign('afterPack', ctx)).toThrow(/sign-pkg failed/)
  } finally {
    if (saved === undefined) delete process.env.PYTHON
    else process.env.PYTHON = saved
  }
})
