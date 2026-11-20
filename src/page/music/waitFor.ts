export interface WaitForOptions {
  intervalMs?: number
  timeoutMs?: number
  signal?: AbortSignal
}

/** Polls `get` until it returns a value (not null/undefined). Rejects on timeout or abort. */
export function waitFor<T>(
  get: () => T | null | undefined,
  { intervalMs = 100, timeoutMs = 30_000, signal }: WaitForOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(signal?.reason ?? new Error('aborted'))
    }
    const finish = (fn: () => void): void => {
      signal?.removeEventListener('abort', onAbort)
      fn()
    }
    const tick = (): void => {
      let value: T | null | undefined
      try {
        value = get()
      } catch (err) {
        finish(() => reject(err))
        return
      }
      if (value != null) finish(() => resolve(value))
      else if (Date.now() - started >= timeoutMs)
        finish(() => reject(new Error(`timed out after ${timeoutMs}ms`)))
      else timer = setTimeout(tick, intervalMs)
    }
    if (signal?.aborted) return reject(signal.reason ?? new Error('aborted'))
    signal?.addEventListener('abort', onAbort, { once: true })
    tick()
  })
}
