// Pure helpers for scripts/bench.ts: process memory parsing, medians, the results file and comparisons.

/** MB per process type, e.g. `{ renderer: 330.1, gpu: 68.7, ... }` */
export type ByType = Record<string, number>

export interface ScenarioResult {
  /** PSS of all pod processes, MB (median of the samples) */
  totalMB: number
  /** PSS per process type, MB (median of each) */
  byTypeMB: ByType
  /** page JS heap in use, MB */
  heapMB: number
  /** elements in the document (Apple's) + our shadow root */
  domNodes: number
}

export interface BenchRun {
  date: string
  /** short sha, `+dirty` when the tree had uncommitted changes */
  commit: string
  /** electron switches the app ran with */
  flags: string[]
  /** samples per scenario the medians are of */
  samples: number
  scenarios: Record<string, ScenarioResult>
}

/** kB values from /proc/<pid>/smaps_rollup -> MB (`Pss`, `Rss`, `Pss_Anon`, ...) */
export function parseSmapsRollup(text: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const line of text.split('\n')) {
    const m = /^(\w+):\s+(\d+) kB/.exec(line)
    if (m) out[m[1]!] = Number(m[2]) / 1024
  }
  return out
}

/** the parent pid from /proc/<pid>/stat (the command name can hold spaces and parens) */
export function parsePpid(stat: string): number {
  const rest = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
  return Number(rest[1] ?? -1)
}

/**
 * A Chromium process's role from its command line: `main`, `renderer`, `gpu`, or a utility's
 * service (`network`, `cdm`, `audio`, ...). Electron rewrites argv with spaces, not NULs.
 */
export function processType(cmdline: string): string {
  const args = cmdline.replace(/\0/g, ' ')
  const type = /--type=([\w-]+)/.exec(args)?.[1]
  if (!type) return 'main'
  if (type === 'gpu-process') return 'gpu'
  if (type !== 'utility') return type
  const sub = /--utility-sub-type=([\w.]+)/.exec(args)?.[1] ?? ''
  if (sub.startsWith('network')) return 'network'
  if (sub.includes('Cdm')) return 'cdm'
  if (sub.startsWith('audio')) return 'audio'
  return sub.split('.')[0] || 'utility'
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

const round1 = (x: number): number => Math.round(x * 10) / 10

/**
 * samples of per-type MB -> one result: the median of the totals, and per type the median of the
 * samples it's in (a process that starts or exits mid-sampling isn't averaged in as 0)
 */
export function summarize(samples: readonly ByType[], heapMB: number, domNodes: number): ScenarioResult {
  const types = [...new Set(samples.flatMap((s) => Object.keys(s)))].sort()
  const byTypeMB: ByType = {}
  for (const t of types) byTypeMB[t] = round1(median(samples.flatMap((s) => (t in s ? [s[t]!] : []))))
  const totals = samples.map((s) => Object.values(s).reduce((a, b) => a + b, 0))
  return { totalMB: round1(median(totals)), byTypeMB, heapMB: round1(heapMB), domNodes }
}

/** the runs in a results.jsonl (blank and broken lines skipped) */
export function parseRuns(text: string): BenchRun[] {
  const runs: BenchRun[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      runs.push(JSON.parse(line) as BenchRun)
    } catch {
      // a hand-edited or truncated line shouldn't stop the comparison
    }
  }
  return runs
}

const fmt = (x: number): string => x.toFixed(1).padStart(7)
const delta = (now: number, prev: number | undefined): string => {
  if (prev === undefined) return ''
  const d = now - prev
  return `  ${d >= 0 ? '+' : ''}${d.toFixed(1)}`
}

/** a table of `run`, with differences from `prev` when given */
export function formatRun(run: BenchRun, prev?: BenchRun): string {
  const lines: string[] = []
  if (prev) {
    lines.push(`vs ${prev.commit} (${prev.date.slice(0, 16).replace('T', ' ')})`)
    if (prev.flags.join(' ') !== run.flags.join(' ')) lines.push(`! flags differ: ${prev.flags.join(' ') || '(none)'}`)
  }
  for (const [name, s] of Object.entries(run.scenarios)) {
    const p = prev?.scenarios[name]
    lines.push('', `${name.padEnd(10)} total ${fmt(s.totalMB)} MB${delta(s.totalMB, p?.totalMB)}`)
    for (const [t, mb] of Object.entries(s.byTypeMB)) {
      lines.push(`  ${t.padEnd(16)} ${fmt(mb)}${delta(mb, p?.byTypeMB[t])}`)
    }
    // process types the previous run had and this one doesn't
    for (const [t, mb] of Object.entries(p?.byTypeMB ?? {})) {
      if (!(t in s.byTypeMB)) lines.push(`  ${t.padEnd(16)} ${'gone'.padStart(7)}${delta(0, mb)}`)
    }
    lines.push(`  ${'js heap'.padEnd(16)} ${fmt(s.heapMB)}${delta(s.heapMB, p?.heapMB)}`)
    lines.push(`  ${'dom nodes'.padEnd(16)} ${String(s.domNodes).padStart(7)}${p ? delta(s.domNodes, p.domNodes).replace('.0', '') : ''}`)
  }
  return lines.join('\n')
}
