import { describe, expect, test } from 'bun:test'
import { waitFor } from './waitFor'

describe('waitFor', () => {
  test('resolves immediately when the value is there', async () => {
    expect(await waitFor(() => 42)).toBe(42)
  })

  test('keeps polling until a value appears (falsy non-null counts)', async () => {
    let calls = 0
    const value = await waitFor(() => (++calls < 3 ? undefined : 0), { intervalMs: 1 })
    expect(value).toBe(0)
    expect(calls).toBe(3)
  })

  test('rejects after the timeout', async () => {
    await expect(waitFor(() => null, { intervalMs: 1, timeoutMs: 10 })).rejects.toThrow('timed out')
  })

  test('rejects when the getter throws', async () => {
    await expect(
      waitFor(() => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
  })

  test('rejects on abort, before or while waiting', async () => {
    const pre = new AbortController()
    pre.abort(new Error('gone'))
    await expect(waitFor(() => 1, { signal: pre.signal })).rejects.toThrow('gone')

    const ctl = new AbortController()
    const p = waitFor(() => null, { intervalMs: 1, signal: ctl.signal })
    ctl.abort(new Error('stop'))
    await expect(p).rejects.toThrow('stop')
  })
})
