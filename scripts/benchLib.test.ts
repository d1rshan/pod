import { describe, expect, test } from 'bun:test'
import { formatRun, median, parsePpid, parseRuns, parseSmapsRollup, processType, summarize, type BenchRun } from './benchLib'

describe('parseSmapsRollup', () => {
  test('kB -> MB', () => {
    const text = '5591a000-7ffd [rollup]\nRss:              204800 kB\nPss:              102400 kB\nPss_Anon:          51200 kB\n'
    expect(parseSmapsRollup(text)).toEqual({ Rss: 200, Pss: 100, Pss_Anon: 50 })
  })
})

describe('parsePpid', () => {
  test('command names with spaces and parens', () => {
    expect(parsePpid('123 (electron) S 45 123 0')).toBe(45)
    expect(parsePpid('123 (we (ird) name) S 7 1 0')).toBe(7)
  })
})

describe('processType', () => {
  test('main, renderer, gpu and utilities', () => {
    expect(processType('/x/electron --no-sandbox .')).toBe('main')
    expect(processType('/x/electron --type=renderer --foo')).toBe('renderer')
    expect(processType('/x/electron\0--type=gpu-process')).toBe('gpu')
    expect(processType('/x/electron --type=utility --utility-sub-type=network.mojom.NetworkService')).toBe('network')
    expect(processType('/x/electron --type=utility --utility-sub-type=media.mojom.CdmServiceBroker')).toBe('cdm')
    expect(processType('/x/electron --type=utility --utility-sub-type=audio.mojom.AudioService')).toBe('audio')
    expect(processType('/x/electron --type=utility --utility-sub-type=storage.mojom.StorageService')).toBe('storage')
  })
})

describe('median', () => {
  test('odd, even, empty', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBe(0)
  })
})

describe('summarize', () => {
  test('medians per type and of the totals', () => {
    const r = summarize(
      [
        { main: 100, renderer: 300 },
        { main: 110, renderer: 290, cdm: 50 },
        { main: 105, renderer: 310 }
      ],
      45.04,
      120
    )
    expect(r).toEqual({ totalMB: 415, byTypeMB: { cdm: 50, main: 105, renderer: 300 }, heapMB: 45, domNodes: 120 })
  })
})

const run = (commit: string, total: number): BenchRun => ({
  date: '2026-11-23T10:00:00.000Z',
  commit,
  flags: ['--no-zygote'],
  samples: 5,
  scenarios: { idle: { totalMB: total, byTypeMB: { main: 100, renderer: total - 100 }, heapMB: 40, domNodes: 4800 } }
})

describe('parseRuns', () => {
  test('skips blank and broken lines', () => {
    const text = `${JSON.stringify(run('a', 400))}\n\nnot json\n${JSON.stringify(run('b', 380))}\n`
    expect(parseRuns(text).map((r) => r.commit)).toEqual(['a', 'b'])
  })
})

describe('formatRun', () => {
  test('shows differences from the previous run', () => {
    const out = formatRun(run('b', 380), run('a', 400))
    expect(out).toContain('vs a')
    expect(out).toContain('total   380.0 MB  -20.0')
    expect(out).toContain('renderer           280.0  -20.0')
  })
  test('lists process types that are gone', () => {
    const prev = run('a', 400)
    prev.scenarios['idle']!.byTypeMB['cdm'] = 100
    expect(formatRun(run('b', 380), prev)).toContain('cdm                 gone  -100.0')
  })
  test('warns when flags differ', () => {
    const prev = { ...run('a', 400), flags: [] }
    expect(formatRun(run('b', 380), prev)).toContain('! flags differ')
  })
})
