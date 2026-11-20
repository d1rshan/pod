// The only module that touches MusicKit directly (spec: ui -> state -> music -> MusicKit).
// music.apple.com loads and configures MusicKit JS itself; we just use its instance.
import { waitFor } from './waitFor'

/** The slice of MusicKit's instance API we use (no official types without a dev account). */
export interface MusicKitInstance {
  readonly isAuthorized: boolean
  authorize(): Promise<string | void>
  /** MusicKit.PlaybackStates enum (2 = playing, 3 = paused, ...) */
  readonly playbackState: number
  /** seconds */
  readonly currentPlaybackTime: number
  /** seconds */
  readonly currentPlaybackDuration: number
  setQueue(options: QueueOptions): Promise<unknown>
  /** the current queue (`items[i].id` = library/catalog song id) */
  readonly queue: {
    readonly items: readonly MediaItem[]
    readonly position: number
    /** the item at `position` (set before playback starts too) */
    readonly currentItem?: MediaItem
  }
  changeToMediaAtIndex(index: number): Promise<unknown>
  skipToNextItem(): Promise<unknown>
  skipToPreviousItem(): Promise<unknown>
  /** seconds */
  seekToTime(time: number): Promise<unknown>
  /** e.g. `us`, for /v1/catalog/{storefront}/... */
  readonly storefrontId: string
  play(): Promise<void>
  pause(): void
  addEventListener(name: string, cb: () => void): void
  removeEventListener(name: string, cb: () => void): void
  /** Apple Music API through the page's tokens; non-2xx (e.g. 404) resolves, it doesn't throw */
  readonly api: { music(path: string, params?: ApiParams): Promise<ApiResponse> }
}

/** a queue item (song) */
export interface MediaItem {
  readonly id: string
  readonly attributes?: {
    readonly name?: string
    readonly artistName?: string
    readonly durationInMillis?: number
    readonly artwork?: { readonly url?: string; readonly bgColor?: string }
    readonly playParams?: { readonly catalogId?: string }
  }
}

export interface QueueOptions {
  song?: string
  /** library (`p.`) or catalog (`pl.`) playlist id */
  playlist?: string
  /** index into the queued items to start from */
  startWith?: number
  startPlaying?: boolean
}

export type ApiParams = Record<string, string | number>

export interface ApiResponse {
  status: number
  data: unknown
}

interface MusicKitGlobal {
  getInstance(): MusicKitInstance | undefined
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal
  }
}

const AUTH_CHANGED = 'authorizationStatusDidChange'

/** Resolves with Apple's MusicKit instance once the page has configured it (waits until aborted). */
export function whenMusicKitReady(signal?: AbortSignal): Promise<MusicKitInstance> {
  return waitFor(() => window.MusicKit?.getInstance(), { timeoutMs: Infinity, signal })
}

/** Calls `cb` whenever the user signs in or out. Returns an unsubscribe function. */
export function onAuthChange(mk: MusicKitInstance, cb: (signedIn: boolean) => void): () => void {
  const handler = (): void => cb(mk.isAuthorized)
  mk.addEventListener(AUTH_CHANGED, handler)
  return () => mk.removeEventListener(AUTH_CHANGED, handler)
}

/** True for MusicKit's "not authorized" rejection (also what closing the popup gives). */
export function isAuthorizationError(err: unknown): boolean {
  return (err as { errorCode?: unknown } | null)?.errorCode === 'AUTHORIZATION_ERROR'
}

/**
 * Opens Apple's sign-in popup. Resolves with whether the user ended up signed in
 * (false when they closed the popup); rejects only on other failures.
 */
export async function signIn(mk: MusicKitInstance): Promise<boolean> {
  try {
    await mk.authorize()
  } catch (err) {
    if (!isAuthorizationError(err)) throw err
  }
  return mk.isAuthorized
}
