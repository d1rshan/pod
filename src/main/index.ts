import { app, BrowserWindow, components } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync, watch } from 'node:fs'
import { join } from 'node:path'
import { APPLE_MUSIC_ORIGIN, isAppleAuthUrl, isAppleMusicUrl } from './navigation'
import {
  SIGN_IN_COOKIE_DOMAIN,
  SIGN_IN_COOKIE_SOURCE,
  SIGN_IN_COOKIE_TARGET,
  cookiesToAdopt
} from './signInCookies'
import { DEFAULT_STOREFRONT, isStorefront, parkedPath, parkedStorefront } from '../shared/parked'

const PARTITION = 'persist:pod'
const PAGE_DIR = join(__dirname, '../page')
const PAGE_BUNDLE = join(PAGE_DIR, 'index.js')
/** written by the page watch build after index.js is fully on disk (see electron.vite.config.ts) */
const PAGE_BUILT_MARKER = '.built'
const RETRY_LOAD_MS = 5000
const ERR_ABORTED = -3
const WIDEVINE_WAIT_MS = 10_000
const dev = !app.isPackaged

// Dev only: expose Chrome DevTools Protocol on localhost so agents can attach
// with `playwright-cli attach --cdp=http://127.0.0.1:9222` to inspect the running app.
if (dev) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env['POD_DEBUG_PORT'] ?? '9222')
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
}

/** the account storefront the page last parked on (shared/parked.ts), so launches skip a reload */
const storefrontFile = (): string => join(app.getPath('userData'), 'storefront')
let storefront: string | undefined

function savedStorefront(): string {
  if (storefront) return storefront
  try {
    const sf = readFileSync(storefrontFile(), 'utf8').trim()
    storefront = isStorefront(sf) ? sf : DEFAULT_STOREFRONT
  } catch {
    storefront = DEFAULT_STOREFRONT
  }
  return storefront
}

function saveStorefront(url: string): void {
  const sf = parkedStorefront(new URL(url).pathname)
  if (!sf || sf === savedStorefront()) return
  storefront = sf
  writeFile(storefrontFile(), sf).catch((err) => console.error('[pod] saving the storefront failed:', err))
}

/** Runs the page bundle in music.apple.com's main world (so it can reach `window.MusicKit`). */
async function injectPage(win: BrowserWindow): Promise<void> {
  const code = await readFile(PAGE_BUNDLE, 'utf8')
  // unpackaged builds expose our stores to scripts driving the app (`bun run bench`)
  await win.webContents.executeJavaScript(dev ? `window.__podDebug = true;\n${code}` : code)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    // 320x520 screen + the graphite bezel drawn by the page (tokens: --size-bezel)
    width: 340,
    height: 540,
    frame: false,
    // the bezel's rounded corners need a see-through window
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: PARTITION,
      // setQueue() can outlast a click's user activation; media keys / auto-advance have none
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  // Inject on every full load, and only show the window once our UI is up
  // so Apple's page never flashes.
  win.webContents.on('dom-ready', () => {
    if (!isAppleMusicUrl(win.webContents.getURL())) return
    injectPage(win)
      .catch((err) => console.error('[pod] inject failed:', err))
      .finally(() => {
        if (!win.isVisible()) win.show()
      })
  })

  // Offline at launch (or any failed load): show the window anyway and keep retrying.
  // TODO(step 8): an offline state in our UI instead of Apple's/Chromium's error page.
  let retry: NodeJS.Timeout | undefined
  /** Apple's page parks on a not-found route: MusicKit loads, no catalog page does (shared/parked.ts) */
  const load = (url = `${APPLE_MUSIC_ORIGIN}${parkedPath(savedStorefront())}`): void => {
    win.loadURL(url).catch(() => {}) // failures are handled in did-fail-load
  }
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, url, isMainFrame) => {
    if (!isMainFrame || errorCode === ERR_ABORTED) return
    console.error(`[pod] load failed (${errorDescription}): ${url}`)
    if (!win.isVisible()) win.show()
    clearTimeout(retry)
    // a failed re-park retries its own storefront, not the saved one
    const parked = isAppleMusicUrl(url) && parkedStorefront(new URL(url).pathname) ? url : undefined
    retry = setTimeout(() => load(parked), RETRY_LOAD_MS)
  })
  win.on('closed', () => clearTimeout(retry))

  // Only music.apple.com in this window. The one popup allowed is Apple's sign-in
  // (MusicKit `authorize()`); it shares this window's session, so the login persists.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAppleAuthUrl(url)) return { action: 'deny' }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        parent: win,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        center: true
      }
    }
  })
  win.webContents.on('did-create-window', (popup) => {
    guardSignInPopup(popup)
    popup.once('closed', () => {
      adoptSignInCookies(win)
        .then((adopted) => {
          if (adopted && !win.isDestroyed()) win.webContents.reload()
        })
        .catch((err) => console.error('[pod] adopting sign-in cookies failed:', err))
    })
  })
  // the page re-parks on the account's storefront when it differs (auth.svelte.ts)
  win.webContents.on('did-navigate', (_e, url) => {
    if (isAppleMusicUrl(url)) saveStorefront(url)
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAppleMusicUrl(url)) e.preventDefault()
  })
  win.webContents.on('will-redirect', (e, url) => {
    if (!isAppleMusicUrl(url)) e.preventDefault()
  })

  load()

  if (dev) watchPageBundle(win)

  return win
}

/** Keeps the sign-in popup on Apple's auth pages and stops it opening more popups. */
function guardSignInPopup(popup: BrowserWindow): void {
  const guard = (e: Electron.Event, url: string): void => {
    if (isAppleAuthUrl(url)) return
    e.preventDefault()
    console.warn(`[pod] blocked sign-in popup navigation: ${url}`) // a gap in APPLE_AUTH_HOSTS?
  }
  popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  popup.webContents.on('will-navigate', guard)
  popup.webContents.on('will-redirect', guard)
}

const SIX_MONTHS_S = 180 * 24 * 60 * 60

/**
 * After the sign-in popup closes: copy Apple's session cookies to .apple.com if
 * they only landed on the authorize domain (see signInCookies.ts). True if any were copied.
 */
async function adoptSignInCookies(win: BrowserWindow): Promise<boolean> {
  if (win.isDestroyed()) return false
  const { cookies } = win.webContents.session
  const [source, target] = await Promise.all([
    cookies.get({ url: SIGN_IN_COOKIE_SOURCE }),
    cookies.get({ url: SIGN_IN_COOKIE_TARGET })
  ])
  const adopt = cookiesToAdopt(source, target)
  for (const c of adopt) {
    await cookies.set({
      url: SIGN_IN_COOKIE_TARGET,
      name: c.name,
      value: c.value,
      domain: SIGN_IN_COOKIE_DOMAIN,
      path: '/',
      secure: true,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expirationDate: c.expirationDate ?? Date.now() / 1000 + SIX_MONTHS_S
    })
  }
  if (adopt.length) await cookies.flushStore()
  return adopt.length > 0
}

/** Dev only: re-inject the page bundle after each watch rebuild finishes (no page reload). */
function watchPageBundle(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined
  const watcher = watch(PAGE_DIR, (_event, file) => {
    if (file !== PAGE_BUILT_MARKER) return
    clearTimeout(timer) // the marker write can fire several events
    timer = setTimeout(() => {
      if (win.isDestroyed() || !isAppleMusicUrl(win.webContents.getURL())) return
      injectPage(win).catch((err) => console.error('[pod] re-inject failed:', err))
    }, 50)
  })
  win.on('closed', () => {
    clearTimeout(timer)
    watcher.close()
  })
}

app.whenReady().then(async () => {
  // castLabs: Widevine is installed/updated at runtime; wait for it before loading
  // music.apple.com so playback can start. Sign in still works if it fails.
  // Capped, so a stalled download (offline first run) can't keep the window from ever showing.
  let widevineTimer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      components.whenReady([components.WIDEVINE_CDM_ID]),
      new Promise((_, reject) => {
        widevineTimer = setTimeout(() => reject(new Error('timed out')), WIDEVINE_WAIT_MS)
      })
    ])
  } catch (err) {
    console.error('[pod] widevine not ready, playback may fail:', err)
  } finally {
    clearTimeout(widevineTimer)
  }
  // Look like plain Chrome: Apple rejects browsers it doesn't recognise (its sign-in
  // popup renders blank). App-wide, because window.open children ignore session.setUserAgent.
  app.userAgentFallback = app.userAgentFallback.replace(/ (Electron|pod)\/\S+/g, '')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
