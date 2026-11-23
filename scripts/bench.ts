// Memory benchmark: builds pod, runs it with the user's signed-in session through fixed scenarios
// (idle, playing, lyrics), measures every pod process's PSS, appends the run to bench/results.jsonl
// and compares it with the previous one. Never commits.
//
//   nix develop --command bun run bench            # run + save
//   nix develop --command bun run bench --no-save  # run, compare, don't save
import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  formatRun,
  parsePpid,
  parseRuns,
  parseSmapsRollup,
  processType,
  summarize,
  type BenchRun,
  type ByType,
  type ScenarioResult
} from './benchLib'

const ROOT = join(import.meta.dir, '..')
const RESULTS = join(ROOT, 'bench/results.jsonl')
/** pod's profile (`app.getPath('userData')`); every Chromium child names it on its command line */
const USER_DATA = join(homedir(), '.config/pod')
/** not the dev app's 9222, so a running `bun dev` is detected instead of attached to */
const PORT = 9223
/** sandbox/zygote off: the agent shell can't run them (AGENTS.md); GPU stays on, as in daily use */
const FLAGS = ['--no-sandbox', '--no-zygote']
/** Blinding Lights: a catalog song with synced lyrics */
const SONG_ID = '1488408568'
const SAMPLES = 5
const SAMPLE_EVERY_MS = 3000
/** how long each scenario runs before sampling */
const SETTLE_MS = { idle: 30_000, playing: 45_000, lyrics: 30_000 }
const READY_TIMEOUT_MS = 90_000
/** a single CDP call (a crashed or stuck page fails the run instead of hanging it) */
const EVAL_TIMEOUT_MS = 15_000
const STOP_TIMEOUT_MS = 5000

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const log = (msg: string): void => console.log(`[bench] ${msg}`)

// --- processes

function readProc(pid: number, file: string): string {
  try {
    return readFileSync(`/proc/${pid}/${file}`, 'utf8')
  } catch {
    return ''
  }
}

/** the electron binary `node_modules/electron` installed */
function electronPath(): string {
  try {
    return join(ROOT, 'node_modules/electron/dist', readFileSync(join(ROOT, 'node_modules/electron/path.txt'), 'utf8').trim())
  } catch {
    throw new Error('electron is not installed (run `bun install`)')
  }
}

/** any pod using the profile: dev, preview or packaged (their children name the user data dir) */
function podIsRunning(): boolean {
  const flag = `--user-data-dir=${USER_DATA}`
  return allPids().some((p) => readProc(p, 'cmdline').replace(/\0/g, ' ').includes(flag))
}

function allPids(): number[] {
  return readdirSync('/proc')
    .filter((d) => /^\d+$/.test(d))
    .map(Number)
}

/** PSS (MB) per process type over `root` and all its descendants that are electron processes */
function sampleMemory(root: number, electron: string): ByType {
  const pids = allPids()
  const parent = new Map(pids.map((p) => [p, parsePpid(readProc(p, 'stat'))]))
  const tree = new Set([root])
  // parents can come after their children in /proc order: repeat until nothing new joins
  for (let grew = true; grew; ) {
    grew = false
    for (const p of pids) {
      if (!tree.has(p) && tree.has(parent.get(p) ?? -1)) {
        tree.add(p)
        grew = true
      }
    }
  }
  const byType: ByType = {}
  for (const p of tree) {
    const cmd = readProc(p, 'cmdline')
    if (!cmd.startsWith(electron)) continue
    const pss = parseSmapsRollup(readProc(p, 'smaps_rollup'))['Pss'] ?? 0
    const t = processType(cmd)
    byType[t] = (byType[t] ?? 0) + pss
  }
  return byType
}

// --- CDP (the page target only: Runtime.evaluate)

interface Page {
  eval<T>(expression: string): Promise<T>
  close(): void
}

async function connectPage(deadline: number): Promise<Page> {
  for (;;) {
    try {
      const targets = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as {
        type: string
        url: string
        webSocketDebuggerUrl: string
      }[]
      const page = targets.find((t) => t.type === 'page' && t.url.startsWith('https://music.apple.com'))
      if (page) return await openPage(page.webSocketDebuggerUrl)
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error("the app's page never showed up on the debug port")
    await sleep(500)
  }
}

function openPage(url: string): Promise<Page> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    let id = 0
    let closed = false
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data)) as {
        id?: number
        result?: { result?: { value?: unknown }; exceptionDetails?: { exception?: { description?: string }; text?: string } }
        error?: { message: string }
      }
      const p = msg.id === undefined ? undefined : pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id!)
      const ex = msg.result?.exceptionDetails
      if (msg.error) p.reject(new Error(msg.error.message))
      else if (ex) p.reject(new Error(ex.exception?.description ?? ex.text ?? 'evaluate failed'))
      else p.resolve(msg.result?.result?.value)
    }
    ws.onerror = () => reject(new Error(`couldn't connect to ${url}`))
    ws.onclose = () => {
      closed = true
      for (const p of pending.values()) p.reject(new Error('the page closed'))
      pending.clear()
    }
    ws.onopen = () =>
      resolve({
        eval: <T>(expression: string) =>
          new Promise<T>((res, rej) => {
            if (closed) return rej(new Error('the page closed'))
            const n = ++id
            const timer = setTimeout(() => {
              pending.delete(n)
              rej(new Error(`no answer from the page in ${EVAL_TIMEOUT_MS / 1000}s`))
            }, EVAL_TIMEOUT_MS)
            const done = <V>(fn: (v: V) => void) => (v: V): void => {
              clearTimeout(timer)
              fn(v)
            }
            pending.set(n, { resolve: done(res as (v: unknown) => void), reject: done(rej) })
            ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
          }),
        close: () => ws.close()
      })
  })
}

/** polls `expression` until it's truthy */
async function waitFor(page: Page, expression: string, what: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      if (await page.eval<boolean>(`!!(${expression})`)) return
    } catch {
      // the page can be mid-navigation (e.g. reloading after sign-in cookies)
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await sleep(500)
  }
}

// --- scenarios

const PLAYING = '(window.MusicKit?.getInstance()?.playbackState === 2)'

async function measure(page: Page, root: number, electron: string, name: keyof typeof SETTLE_MS): Promise<ScenarioResult> {
  log(`${name}: settling ${SETTLE_MS[name] / 1000}s`)
  await sleep(SETTLE_MS[name])
  const samples: ByType[] = []
  for (let i = 0; i < SAMPLES; i++) {
    if (i) await sleep(SAMPLE_EVERY_MS)
    samples.push(sampleMemory(root, electron))
  }
  const { heap, nodes } = await page.eval<{ heap: number; nodes: number }>(`({
    heap: performance.memory.usedJSHeapSize / 1048576,
    nodes: document.getElementsByTagName('*').length
      + (document.getElementById('pod-root')?.shadowRoot?.querySelectorAll('*').length ?? 0)
  })`)
  const result = summarize(samples, heap, nodes)
  log(`${name}: ${result.totalMB} MB`)
  return result
}

function gitCommit(): string {
  const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
  const status = spawnSync('git', ['status', '--porcelain', '--', '.', ':!bench/results.jsonl'], { cwd: ROOT, encoding: 'utf8' }).stdout
  return status.trim() ? `${sha}+dirty` : sha
}

async function main(): Promise<void> {
  const save = !process.argv.includes('--no-save')
  const electron = electronPath()
  if (podIsRunning()) throw new Error('pod is already running: close it first (it shares the session)')

  log('building')
  const build = spawnSync('bun', ['run', 'build'], { cwd: ROOT, stdio: 'ignore' })
  if (build.status !== 0) throw new Error('build failed (run `bun run build` to see why)')

  log('starting pod')
  const app = spawn(electron, [...FLAGS, ROOT], {
    cwd: ROOT,
    detached: true, // its own process group, so every child goes when we stop it
    stdio: 'ignore',
    env: { ...process.env, POD_DEBUG_PORT: String(PORT) }
  })
  const exited = new Promise<void>((resolve) => app.once('exit', () => resolve()))
  const failed = new Promise<never>((_, reject) =>
    app.once('error', (err) => reject(new Error(`couldn't start electron: ${err.message} (inside \`nix develop\`?)`)))
  )
  failed.catch(() => {}) // only matters while raced below
  const signal = (sig: NodeJS.Signals): void => {
    try {
      if (app.pid) process.kill(-app.pid, sig)
    } catch {
      // already gone
    }
  }
  /** stops the app and waits for it to go (SIGKILL if it hangs), so a next run starts clean */
  const stop = async (): Promise<void> => {
    if (app.exitCode !== null || app.signalCode !== null) return
    signal('SIGTERM')
    const timer = setTimeout(() => signal('SIGKILL'), STOP_TIMEOUT_MS)
    await exited
    clearTimeout(timer)
  }
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]] as const) {
    process.on(sig, () => void stop().finally(() => process.exit(code)))
  }

  let page: Page | undefined
  try {
    const deadline = Date.now() + READY_TIMEOUT_MS
    page = await Promise.race([connectPage(deadline), failed])
    const root = app.pid!
    const debug = 'window.__pod?.debug'
    await waitFor(page, `${debug} && window.MusicKit?.getInstance()?.isAuthorized`, 'sign-in (sign in with `bun dev` first)', deadline - Date.now())

    const scenarios: Record<string, ScenarioResult> = {}
    await page.eval(`${debug}.nav.select('library')`)
    await waitFor(page, `${debug}.library.playlists.data`, 'the library to load', 30_000)
    scenarios['idle'] = await measure(page, root, electron, 'idle')

    // not awaited: MusicKit's play can stall; the wait below has the deadline
    await page.eval(`void ${debug}.player.playSong('${SONG_ID}')`)
    await page.eval(`${debug}.nav.select('playing')`)
    await waitFor(page, PLAYING, 'playback to start', 60_000)
    scenarios['playing'] = await measure(page, root, electron, 'playing')

    await page.eval(`${debug}.nav.open({ name: 'lyrics' })`)
    await waitFor(page, `${debug}.lyrics.status === 'ready'`, 'the lyrics to load', 30_000)
    scenarios['lyrics'] = await measure(page, root, electron, 'lyrics')
    if (!(await page.eval<boolean>(PLAYING))) throw new Error('playback stopped during the run: results discarded')

    const run: BenchRun = {
      date: new Date().toISOString(),
      commit: gitCommit(),
      flags: FLAGS,
      samples: SAMPLES,
      scenarios
    }
    const prev = existsSync(RESULTS) ? parseRuns(readFileSync(RESULTS, 'utf8')).at(-1) : undefined
    console.log(`\n${formatRun(run, prev)}\n`)
    if (save) {
      mkdirSync(join(ROOT, 'bench'), { recursive: true })
      appendFileSync(RESULTS, `${JSON.stringify(run)}\n`)
      log('saved to bench/results.jsonl (not committed)')
    }
  } finally {
    page?.close()
    await stop()
  }
}

main().catch((err: unknown) => {
  console.error(`[bench] ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
