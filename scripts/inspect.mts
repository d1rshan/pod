/**
 * Runs on Node (Playwright CDP hangs under Bun). Inspect the running dev app over CDP (start it first: `nix develop --command bun dev`).
 *
 *   bun run inspect shot [file]        screenshot (default: .inspect/shot.png)
 *   bun run inspect logs [seconds]     reload the page and print console output + errors (default 5s)
 *   bun run inspect eval "<js>"        evaluate JS in the page, print the JSON result
 *   bun run inspect click "<selector>" click an element (CSS; pierces open shadow roots)
 *   bun run inspect state              MusicKit status: authorized, playback, now playing
 */
import { chromium, type Page } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const PORT = process.env['POD_DEBUG_PORT'] ?? '9222'
const [cmd = 'shot', arg] = process.argv.slice(2)

async function getPage(): Promise<Page> {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => {
    console.error(`Could not connect on port ${PORT}. Is \`bun dev\` running?`)
    process.exit(1)
  })
  const pages = browser.contexts().flatMap((c) => c.pages())
  const page = pages.find((p) => !p.url().startsWith('devtools://'))
  if (!page) {
    console.error('No app window found.')
    process.exit(1)
  }
  return page
}

const STATE_JS = `(() => {
  const MK = window.MusicKit
  if (!MK) return { url: location.href, musicKit: false }
  const m = MK.getInstance()
  const item = m.nowPlayingItem
  return {
    url: location.href,
    musicKit: true,
    authorized: m.isAuthorized,
    playbackState: m.playbackState,
    time: m.currentPlaybackTime,
    duration: m.currentPlaybackDuration,
    nowPlaying: item ? { title: item.title, artist: item.artistName, id: item.id } : null
  }
})()`

const page = await getPage()

switch (cmd) {
  case 'shot': {
    const file = arg ?? '.inspect/shot.png'
    mkdirSync(dirname(file), { recursive: true })
    await page.screenshot({ path: file })
    console.log(file)
    break
  }
  case 'logs': {
    const seconds = Number(arg ?? 5)
    page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`))
    page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`))
    await page.reload()
    await page.waitForTimeout(seconds * 1000)
    break
  }
  case 'eval': {
    if (!arg) throw new Error('usage: inspect eval "<js>"')
    console.log(JSON.stringify(await page.evaluate(arg), null, 2))
    break
  }
  case 'click': {
    if (!arg) throw new Error('usage: inspect click "<selector>"')
    await page
      .locator(arg)
      .first()
      .click({ timeout: 5000 })
      .then(() => console.log(`clicked ${arg}`))
      .catch(() => {
        console.error(`no clickable element matches: ${arg}`)
        process.exit(1)
      })
    break
  }
  case 'state': {
    console.log(JSON.stringify(await page.evaluate(STATE_JS), null, 2))
    break
  }
  default:
    console.error(`unknown command: ${cmd}`)
    process.exit(1)
}

// connectOverCDP keeps the socket open; exit without closing the app.
process.exit(0)
