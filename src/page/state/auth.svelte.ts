import { isStorefront, parkedPath, parkedStorefront } from '../../shared/parked'
import {
  accountStorefront,
  onStorefrontChange,
  signIn,
  whenMusicKitReady,
  type MusicKitInstance
} from '../music/musickit'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unavailable'

/** after this, show "couldn't reach Apple Music" (but keep waiting for MusicKit) */
const SLOW_LOAD_MS = 20_000

/** reloads in a row before giving up (a navigation can cut one short, e.g. main's after sign-in) */
const MAX_REPARKS = 3
const REPARKS_KEY = 'pod:reparks'

function reparks(): number {
  try {
    return Number(sessionStorage.getItem(REPARKS_KEY)) || 0
  } catch {
    return 0
  }
}

function setReparks(n: number): void {
  try {
    if (n) sessionStorage.setItem(REPARKS_KEY, String(n))
    else sessionStorage.removeItem(REPARKS_KEY)
  } catch {
    // no storage: the cap just doesn't hold
  }
}

/**
 * Apple's page is parked on `/{storefront}/pod` (shared/parked.ts). MusicKit plays previews only
 * when that storefront isn't the account's, so on a mismatch (first run, another account) the page
 * reloads on the right one; main remembers it for the next launch. True if it's reloading.
 */
function parkOnAccountStorefront(mk: MusicKitInstance): boolean {
  const sf = accountStorefront(mk)
  if (!sf) return false
  if (!isStorefront(sf)) {
    console.error(`[pod] unexpected account storefront "${sf}": playback may be previews only`)
    return false
  }
  if (parkedStorefront(location.pathname) === sf) {
    setReparks(0)
    return false
  }
  const tries = reparks()
  if (tries >= MAX_REPARKS) {
    console.error(`[pod] couldn't park on ${parkedPath(sf)} (at ${location.pathname}): playback may be previews only`)
    return false
  }
  setReparks(tries + 1)
  location.replace(parkedPath(sf))
  return true
}

/** Sign-in state of the page's MusicKit. `start()` from the root component, it returns the cleanup. */
class Auth {
  status = $state<AuthStatus>('loading')
  /** Apple's popup is open; authorize() settles when it closes (signed in or not) */
  signingIn = $state(false)
  error = $state<string | undefined>()
  #mk: MusicKitInstance | undefined

  start(): () => void {
    const ctl = new AbortController()
    let unsubscribe: (() => void) | undefined

    this.status = 'loading'
    const slow = setTimeout(() => {
      if (this.status === 'loading') this.status = 'unavailable'
    }, SLOW_LOAD_MS)
    whenMusicKitReady(ctl.signal).then(
      (mk) => {
        if (ctl.signal.aborted) return
        clearTimeout(slow)
        this.#mk = mk
        const settle = (): void => this.#settle(mk)
        unsubscribe = onStorefrontChange(mk, settle) // sign in/out too
        settle()
      },
      (err) => {
        if (!ctl.signal.aborted) console.error('[pod] MusicKit not ready:', err)
      }
    )

    return () => {
      ctl.abort()
      clearTimeout(slow)
      unsubscribe?.()
      this.#mk = undefined
    }
  }

  /** status from MusicKit's; while the page re-parks, the spinner (no playback on previews) */
  #settle(mk: MusicKitInstance): void {
    if (parkOnAccountStorefront(mk)) this.status = 'loading'
    else this.status = mk.isAuthorized ? 'signed-in' : 'signed-out'
  }

  async signIn(): Promise<void> {
    const mk = this.#mk
    if (!mk || this.signingIn) return
    this.signingIn = true
    this.error = undefined
    try {
      await signIn(mk)
      if (this.#mk === mk) this.#settle(mk)
    } catch (err) {
      console.error('[pod] sign in failed:', err)
      if (this.#mk === mk) this.error = "Couldn't sign in. Try again."
    } finally {
      this.signingIn = false
    }
  }
}

export const auth = new Auth()
