import { app, BrowserWindow, session } from 'electron'
import { join } from 'node:path'

const PARTITION = 'persist:pod'

// Dev only: expose Chrome DevTools Protocol on localhost so agents can attach
// with `playwright-cli attach --cdp=http://127.0.0.1:9222` to inspect the running app.
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env['POD_DEBUG_PORT'] ?? '9222')
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
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

  win.once('ready-to-show', () => win.show())

  // TODO: load https://music.apple.com instead of the local renderer.
  // TODO: allowlist Apple sign-in popups (setWindowOpenHandler) and deny everything else.
  // TODO: inject the pod UI into a Shadow DOM over Apple's (hidden) UI.
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  // TODO: Widevine readiness - await castLabs `components.whenReady()` before loading music.apple.com.
  void session.fromPartition(PARTITION)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
