import { app, BrowserWindow, session } from 'electron'
import { readFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import { join } from 'node:path'
import { APPLE_MUSIC_ORIGIN, isAppleMusicUrl } from './navigation'

const PARTITION = 'persist:pod'
const APPLE_MUSIC_URL = `${APPLE_MUSIC_ORIGIN}/`
const PAGE_DIR = join(__dirname, '../page')
const PAGE_BUNDLE = join(PAGE_DIR, 'index.js')
/** written by the page watch build after index.js is fully on disk (see electron.vite.config.ts) */
const PAGE_BUILT_MARKER = '.built'
const RETRY_LOAD_MS = 5000
const ERR_ABORTED = -3
const dev = !app.isPackaged

// Dev only: expose Chrome DevTools Protocol on localhost so agents can attach
// with `playwright-cli attach --cdp=http://127.0.0.1:9222` to inspect the running app.
if (dev) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env['POD_DEBUG_PORT'] ?? '9222')
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
}

/** Runs the page bundle in music.apple.com's main world (so it can reach `window.MusicKit`). */
async function injectPage(win: BrowserWindow): Promise<void> {
  const code = await readFile(PAGE_BUNDLE, 'utf8')
  await win.webContents.executeJavaScript(code)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 320,
    height: 520,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: PARTITION
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
  // TODO(step 7): an offline state in our UI instead of Apple's/Chromium's error page.
  let retry: NodeJS.Timeout | undefined
  const load = (): void => {
    win.loadURL(APPLE_MUSIC_URL).catch(() => {}) // failures are handled in did-fail-load
  }
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, url, isMainFrame) => {
    if (!isMainFrame || errorCode === ERR_ABORTED) return
    console.error(`[pod] load failed (${errorDescription}): ${url}`)
    if (!win.isVisible()) win.show()
    clearTimeout(retry)
    retry = setTimeout(load, RETRY_LOAD_MS)
  })
  win.on('closed', () => clearTimeout(retry))

  // Only music.apple.com in this window; no popups for now.
  // TODO(step 1): allow Apple sign-in popups (Apple auth domains only).
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
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
  // TODO(step 1): Widevine readiness - await castLabs `components.whenReady()` before loading music.apple.com.
  const ses = session.fromPartition(PARTITION)
  // Look like plain Chrome: Apple may reject browsers it doesn't recognise.
  ses.setUserAgent(ses.getUserAgent().replace(/ (Electron|pod)\/\S+/g, ''))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
