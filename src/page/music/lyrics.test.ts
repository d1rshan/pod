import { describe, expect, test } from 'bun:test'
import type { MusicKitInstance } from './musickit'
import {
  activeLines,
  currentLine,
  fetchLyrics,
  parseTime,
  parseTtml,
  toLyrics,
  withInstrumentals,
  words,
  type LyricLine,
  type SungLine
} from './lyrics'

const tt = (body: string, timing = 'Word', agents = ''): string =>
  `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" itunes:timing="${timing}" xml:lang="en"><head><metadata><ttm:agent type="person" xml:id="v1"><ttm:name type="full">Vocal 1</ttm:name></ttm:agent>${agents}<iTunesMetadata xmlns="http://music.apple.com/lyric-ttml-internal" leadingSilence="0"><translations/><songwriters><songwriter>A &amp; B</songwriter></songwriters><audio lyricOffset="1.115" role="spatial"/></iTunesMetadata></metadata></head><body dur="3:21.570"><div begin="27.395" end="48.621" itunes:songPart="Verse">${body}</div></body></tt>`

const WORD_LINE =
  '<p begin="30.189" end="32.529" itunes:key="L2" ttm:agent="v1"><span begin="30.189" end="30.396">I&apos;ve</span> <span begin="30.396" end="30.642">been</span> <span begin="31.498" end="31.839">long</span> <span begin="31.839" end="31.996">e</span><span begin="31.996" end="32.529">nough</span></p>'

const sung = (begin: number, end: number, extra: Partial<SungLine> = {}): SungLine => ({
  kind: 'sung',
  begin,
  end,
  text: 'x',
  syllables: [],
  background: [],
  secondary: false,
  ...extra
})

describe('parseTime', () => {
  test('reads seconds, minutes and hours', () => {
    expect(parseTime('27.395')).toBeCloseTo(27.395)
    expect(parseTime('3:21.570')).toBeCloseTo(201.57)
    expect(parseTime('1:02:03.5')).toBeCloseTo(3723.5)
    expect(parseTime('42')).toBe(42)
    expect(parseTime('12.5s')).toBe(12.5)
  })
  test('NaN for junk', () => {
    expect(parseTime(undefined)).toBeNaN()
    expect(parseTime('')).toBeNaN()
    expect(parseTime('abc')).toBeNaN()
    expect(parseTime('1:2:3:4')).toBeNaN()
  })
})

describe('parseTtml', () => {
  test('word-timed line: syllables, word boundaries, entities', () => {
    const [line] = parseTtml(tt(WORD_LINE))
    expect(line?.text).toBe("I've been long enough")
    expect(line?.begin).toBeCloseTo(30.189)
    expect(line?.end).toBeCloseTo(32.529)
    expect(line?.secondary).toBe(false)
    expect(line?.syllables.map((s) => [s.text, s.space])).toEqual([
      ["I've", true],
      ['been', true],
      ['long', true],
      ['e', false],
      ['nough', false]
    ])
    expect(line?.syllables[3]?.begin).toBeCloseTo(31.839)
    expect(line?.syllables[3]?.end).toBeCloseTo(31.996)
  })

  test('background vocals are kept apart from the line', () => {
    const [line] = parseTtml(
      tt(
        '<p begin="2:19.610" end="2:23.809" ttm:agent="v1"><span begin="2:19.610" end="2:19.899">I&apos;m</span> <span begin="2:21.228" end="2:22.261">know</span> <span ttm:role="x-bg"><span begin="2:21.720" end="2:22.154">(Back</span> <span begin="2:22.889" end="2:23.809">know)</span></span></p>'
      )
    )
    expect(line?.text).toBe("I'm know")
    expect(line?.syllables.map((s) => s.text)).toEqual(["I'm", 'know'])
    expect(line?.syllables[1]?.space).toBe(false)
    expect(line?.background.map((s) => [s.text, s.space])).toEqual([
      ['(Back', true],
      ['know)', false]
    ])
    expect(line?.background[0]?.begin).toBeCloseTo(141.72)
  })

  test('line-timed lyrics have text but no syllables', () => {
    const lines = parseTtml(
      tt(
        '<p begin="58.853" end="1:02.923" itunes:key="L1" ttm:agent="v1">Place me, place me</p><p begin="1:03.039" end="1:07.189">Place   me in my casket</p>',
        'Line'
      )
    )
    expect(lines.map((l) => [l.text, l.syllables.length])).toEqual([
      ['Place me, place me', 0],
      ['Place me in my casket', 0]
    ])
    expect(lines[1]?.begin).toBeCloseTo(63.039)
  })

  test('other singers are secondary; groups and unknown agents are not', () => {
    const lines = parseTtml(
      tt(
        '<p begin="1" end="2" ttm:agent="v1">a</p><p begin="2" end="3" ttm:agent="v2">b</p><p begin="3" end="4">c</p><p begin="4" end="5" ttm:agent="v1000">d</p><p begin="5" end="6" ttm:agent="v9">e</p>',
        'Word',
        '<ttm:agent type="person" xml:id="v2"/><ttm:agent type="group" xml:id="v1000"/>'
      )
    )
    expect(lines.map((l) => l.secondary)).toEqual([false, true, false, false, false])
  })

  test('text outside the spans: the line is lit as a whole instead of losing it', () => {
    const [line] = parseTtml(tt('<p begin="1" end="3"><span begin="1" end="2">Hey</span>, you</p>'))
    expect(line?.text).toBe('Hey, you')
    expect(line?.syllables).toEqual([])
  })

  test('out-of-range character references stay as written', () => {
    const [line] = parseTtml(tt('<p begin="1" end="2">a &#99999999; &#x41;</p>'))
    expect(line?.text).toBe('a &#99999999; A')
  })

  test('drops empty and untimed lines, sorts by begin', () => {
    const lines = parseTtml(tt('<p begin="5" end="6">later</p><p begin="1" end="2"> </p><p>no time</p><p begin="2" end="3">first</p>'))
    expect(lines.map((l) => l.text)).toEqual(['first', 'later'])
  })

  test('no lines in garbage', () => {
    expect(parseTtml('not xml at all')).toEqual([])
    expect(toLyrics('<tt><body></body></tt>')).toBeUndefined()
  })
})

describe('withInstrumentals', () => {
  test('long gaps (and a long intro) become instrumental lines', () => {
    const lines = withInstrumentals([sung(27, 29), sung(30, 32), sung(45, 47)])
    expect(lines.map((l) => [l.kind, l.begin, l.end])).toEqual([
      ['instrumental', 0, 27],
      ['sung', 27, 29],
      ['sung', 30, 32],
      ['instrumental', 32, 45],
      ['sung', 45, 47]
    ])
  })
  test('short gaps stay as they are; overlapping lines count to the latest end', () => {
    const lines = withInstrumentals([sung(5, 20), sung(6, 8), sung(25, 26)])
    expect(lines.every((l) => l.kind === 'sung')).toBe(true)
  })
})

describe('toLyrics', () => {
  test('duet when someone else sings', () => {
    const v2 = '<ttm:agent type="person" xml:id="v2"/>'
    expect(toLyrics(tt('<p begin="1" end="2">a</p>', 'Word', v2))?.duet).toBe(false)
    expect(toLyrics(tt('<p begin="1" end="2">a</p><p begin="2" end="3" ttm:agent="v2">b</p>', 'Word', v2))?.duet).toBe(true)
  })
})

describe('currentLine', () => {
  const lines: LyricLine[] = [sung(10, 12), sung(12, 14), sung(16, 18)]
  test('-1 before the first line', () => {
    expect(currentLine(lines, 0)).toBe(-1)
    expect(currentLine([], 5)).toBe(-1)
  })
  test('the line holding the time, a little early', () => {
    expect(currentLine(lines, 9.8)).toBe(0)
    expect(currentLine(lines, 11)).toBe(0)
    expect(currentLine(lines, 11.8)).toBe(1) // lookahead: both hold 12.05, the later wins
  })
  test('between lines: the one before', () => {
    expect(currentLine(lines, 15)).toBe(1)
  })
  test('after the last: the last', () => {
    expect(currentLine(lines, 100)).toBe(2)
  })
})

describe('activeLines', () => {
  test('overlapping lines are sung together', () => {
    const lines: LyricLine[] = [sung(10, 14), sung(12, 16), sung(20, 22)]
    expect(activeLines(lines, 13)).toEqual([0, 1])
    expect(activeLines(lines, 11)).toEqual([0])
  })
  test('between lines: the one before; before the first: none', () => {
    const lines: LyricLine[] = [sung(10, 14), sung(20, 22)]
    expect(activeLines(lines, 17)).toEqual([0])
    expect(activeLines(lines, 1)).toEqual([])
  })
})

describe('words', () => {
  test('groups syllables up to a space', () => {
    const s = (text: string, space: boolean) => ({ text, begin: 0, end: 0, space })
    expect(words([s('long', true), s('e', false), s('nough', true), s('x', false)]).map((w) => w.map((x) => x.text).join(''))).toEqual([
      'long',
      'enough',
      'x'
    ])
    expect(words([])).toEqual([])
  })
})

describe('fetchLyrics', () => {
  const fakeMk = (res: { status: number; data: unknown }, paths: string[] = []) =>
    ({
      storefrontId: 'in',
      api: {
        music: async (path: string) => {
          paths.push(path)
          return res
        }
      }
    }) as unknown as MusicKitInstance

  test('reads the syllable-lyrics TTML', async () => {
    const paths: string[] = []
    const lyrics = await fetchLyrics(fakeMk({ status: 200, data: { data: [{ attributes: { ttml: tt(WORD_LINE) } }] } }, paths), '1488408568')
    expect(paths).toEqual(['/v1/catalog/in/songs/1488408568/syllable-lyrics'])
    expect(lyrics?.lines.map((l) => l.kind)).toEqual(['instrumental', 'sung'])
  })
  test('undefined on 404 or no TTML', async () => {
    expect(await fetchLyrics(fakeMk({ status: 404, data: undefined }), '1')).toBeUndefined()
    expect(await fetchLyrics(fakeMk({ status: 200, data: { data: [] } }), '1')).toBeUndefined()
  })
  test('throws on other failures', async () => {
    await expect(fetchLyrics(fakeMk({ status: 500, data: undefined }), '1')).rejects.toThrow('HTTP 500')
  })
})
