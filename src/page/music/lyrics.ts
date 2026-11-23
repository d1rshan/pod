// Synced lyrics: apple's `syllable-lyrics` TTML -> lines of timed syllables (docs/lyrics.md).
import type { MusicKitInstance } from './musickit'

/** one timed piece of a word (a word can be split: "e" + "nough"); seconds */
export interface Syllable {
  text: string
  begin: number
  end: number
  /** whitespace follows, so the next syllable starts a new word */
  space: boolean
}

export interface SungLine {
  kind: 'sung'
  /** seconds */
  begin: number
  end: number
  text: string
  /** empty when the line is only line-timed (it lights up as a whole) */
  syllables: Syllable[]
  /** background vocals, shown under the line while it's current */
  background: Syllable[]
  /** sung by someone other than the main singer (right aligned in a duet) */
  secondary: boolean
}

/** a long gap between lines, shown as 3 dots */
export interface InstrumentalLine {
  kind: 'instrumental'
  begin: number
  end: number
}

export type LyricLine = SungLine | InstrumentalLine

export interface Lyrics {
  lines: LyricLine[]
  /** more than one singer */
  duet: boolean
}

/** seconds: a gap between lines longer than this becomes an instrumental line */
export const INSTRUMENTAL_GAP = 9
/** seconds: lines turn current this early (apple's lookahead) */
export const LOOKAHEAD = 0.25

// --- a minimal XML reader (TTML is plain elements, attributes and text) ---

interface XmlElement {
  name: string
  attrs: Record<string, string>
  children: XmlNode[]
}
type XmlNode = XmlElement | string

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e] ?? m
  })
}

const TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!(?:[^>])*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: '#root', attrs: {}, children: [] }
  const stack = [root]
  for (const m of xml.matchAll(TOKEN)) {
    const parent = stack[stack.length - 1]!
    const [, cdata, closing, name, attrText, selfClosing, text] = m
    if (text !== undefined) parent.children.push(decode(text))
    else if (cdata !== undefined) parent.children.push(cdata)
    else if (name === undefined) continue // comment, declaration
    else if (closing) {
      // close up to the matching element (tolerates stray closers)
      let i = stack.length - 1
      while (i > 0 && stack[i]!.name !== name) i--
      if (i > 0) stack.length = i
    } else {
      const attrs: Record<string, string> = {}
      for (const a of (attrText ?? '').matchAll(ATTR)) attrs[a[1]!] = decode(a[2] ?? a[3] ?? '')
      const el: XmlElement = { name, attrs, children: [] }
      parent.children.push(el)
      if (!selfClosing) stack.push(el)
    }
  }
  return root
}

function* elements(el: XmlElement, name: string): Generator<XmlElement> {
  for (const c of el.children) {
    if (typeof c === 'string') continue
    if (c.name === name) yield c
    else yield* elements(c, name)
  }
}

function textOf(node: XmlNode): string {
  return typeof node === 'string' ? node : node.children.map(textOf).join('')
}

// --- TTML ---

/** TTML clock value (`27.395`, `3:21.570`, `1:02:03.4`, `12s`) -> seconds (NaN if unreadable) */
export function parseTime(value: string | undefined): number {
  if (!value) return NaN
  const v = value.trim()
  if (/^\d+(\.\d+)?s$/.test(v)) return parseFloat(v)
  if (!/^\d+(:\d+){0,2}(\.\d+)?$/.test(v)) return NaN
  return v.split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0)
}

/**
 * A line's (or background group's) direct syllable spans. Empty if it has text outside them
 * (it would go missing): such a line lights up as a whole instead.
 */
function syllablesOf(el: XmlElement): Syllable[] {
  const out: Syllable[] = []
  for (const c of el.children) {
    const last = out[out.length - 1]
    if (typeof c === 'string') {
      if (c.trim()) return []
      // whitespace between spans ends the word before it
      if (last && c) last.space = true
      continue
    }
    if (c.name !== 'span' || c.attrs['ttm:role']) continue
    const begin = parseTime(c.attrs.begin)
    const end = parseTime(c.attrs.end)
    const raw = textOf(c)
    if (!Number.isFinite(begin) || !Number.isFinite(end) || !raw.trim()) continue
    if (last && /^\s/.test(raw)) last.space = true
    out.push({ text: raw.trim(), begin, end, space: /\s$/.test(raw) })
  }
  const last = out[out.length - 1]
  if (last) last.space = false
  return out
}

function lineText(p: XmlElement): string {
  return p.children
    .filter((c) => typeof c === 'string' || !c.attrs['ttm:role'])
    .map(textOf)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Agents singing as someone other than the main singer: every person after the first one
 * declared. Groups ("everyone" lines) and unknown agents stay with the main singer.
 */
function secondaryAgents(root: XmlElement): Set<string> {
  const people = [...elements(root, 'ttm:agent')].filter((a) => a.attrs.type === 'person').map((a) => a.attrs['xml:id'] ?? '')
  return new Set(people.slice(1))
}

/** The TTML's lines in time order (no instrumental lines yet). */
export function parseTtml(ttml: string): SungLine[] {
  const root = parseXml(ttml)
  const secondary = secondaryAgents(root)
  const lines: SungLine[] = []
  for (const p of elements(root, 'p')) {
    const syllables = syllablesOf(p)
    const begin = parseTime(p.attrs.begin)
    const end = parseTime(p.attrs.end)
    const text = lineText(p)
    if (!text) continue
    const bgSpan = p.children.find((c): c is XmlElement => typeof c !== 'string' && c.attrs['ttm:role'] === 'x-bg')
    lines.push({
      kind: 'sung',
      begin: Number.isFinite(begin) ? begin : (syllables[0]?.begin ?? NaN),
      end: Number.isFinite(end) ? end : (syllables[syllables.length - 1]?.end ?? NaN),
      text,
      syllables,
      background: bgSpan ? syllablesOf(bgSpan) : [],
      secondary: secondary.has(p.attrs['ttm:agent'] ?? '')
    })
  }
  return lines.filter((l) => Number.isFinite(l.begin) && Number.isFinite(l.end)).sort((a, b) => a.begin - b.begin)
}

/** Adds an instrumental line in every gap longer than `INSTRUMENTAL_GAP` (and before the first line). */
export function withInstrumentals(lines: readonly SungLine[]): LyricLine[] {
  const out: LyricLine[] = []
  let sungUntil = 0
  for (const line of lines) {
    if (line.begin - sungUntil > INSTRUMENTAL_GAP) out.push({ kind: 'instrumental', begin: sungUntil, end: line.begin })
    out.push(line)
    sungUntil = Math.max(sungUntil, line.end)
  }
  return out
}

export function toLyrics(ttml: string): Lyrics | undefined {
  const sung = parseTtml(ttml)
  if (sung.length === 0) return undefined
  return { lines: withInstrumentals(sung), duet: sung.some((l) => l.secondary) }
}

/**
 * Lines being sung at `time` (seconds; overlapping lines in a duet can be sung together): every
 * line holding `time + LOOKAHEAD`, plus `currentLine` if it isn't one of them. Ascending.
 */
export function activeLines(lines: readonly LyricLine[], time: number): number[] {
  const t = time + LOOKAHEAD
  const out: number[] = []
  lines.forEach((l, i) => {
    if (l.begin <= t && t <= l.end) out.push(i)
  })
  if (out.length === 0) {
    const i = currentLine(lines, time)
    if (i >= 0) out.push(i)
  }
  return out
}

/**
 * Index of the current line at `time` (seconds): the last line holding `time + LOOKAHEAD`, else
 * the last one that started before it. -1 before the first line.
 */
export function currentLine(lines: readonly LyricLine[], time: number): number {
  const t = time + LOOKAHEAD
  let started = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]!
    if (l.begin <= t && t <= l.end) return i
    if (started < 0 && l.begin <= t) started = i
  }
  return started
}

/** Splits a line's syllables into words (a word stays on one line when wrapping). */
export function words(syllables: readonly Syllable[]): Syllable[][] {
  const out: Syllable[][] = []
  let word: Syllable[] = []
  for (const s of syllables) {
    word.push(s)
    if (s.space) {
      out.push(word)
      word = []
    }
  }
  if (word.length) out.push(word)
  return out
}

/**
 * The catalog song's synced lyrics, undefined if it has none (404, or nothing timed).
 * Throws on other failures, so they can be retried.
 */
export async function fetchLyrics(mk: MusicKitInstance, catalogId: string): Promise<Lyrics | undefined> {
  const path = `/v1/catalog/${mk.storefrontId}/songs/${encodeURIComponent(catalogId)}/syllable-lyrics`
  const res = await mk.api.music(path)
  if (res.status === 404) return undefined
  if (res.status < 200 || res.status >= 300) throw new Error(`${path}: HTTP ${res.status}`)
  const ttml = (res.data as { data?: { attributes?: { ttml?: string } }[] } | undefined)?.data?.[0]?.attributes?.ttml
  return ttml ? toLyrics(ttml) : undefined
}
