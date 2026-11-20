import { onAuthChange, signIn, whenMusicKitReady, type MusicKitInstance } from '../music/musickit'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'unavailable'

/** after this, show "couldn't reach Apple Music" (but keep waiting for MusicKit) */
const SLOW_LOAD_MS = 20_000

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
        this.status = mk.isAuthorized ? 'signed-in' : 'signed-out'
        unsubscribe = onAuthChange(mk, (signedIn) => {
          this.status = signedIn ? 'signed-in' : 'signed-out'
        })
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

  async signIn(): Promise<void> {
    const mk = this.#mk
    if (!mk || this.signingIn) return
    this.signingIn = true
    this.error = undefined
    try {
      const signedIn = await signIn(mk)
      if (this.#mk === mk) this.status = signedIn ? 'signed-in' : 'signed-out'
    } catch (err) {
      console.error('[pod] sign in failed:', err)
      if (this.#mk === mk) this.error = "Couldn't sign in. Try again."
    } finally {
      this.signingIn = false
    }
  }
}

export const auth = new Auth()
