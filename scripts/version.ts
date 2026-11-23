// Release versions: `bump` = patch | minor | major | x.y.z.
//
//   bun scripts/version.ts <bump>          # print the next version (fails if its tag exists)
//   bun scripts/version.ts <bump> --write  # ... and write it to package.json (the release workflow)
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export type Bump = 'patch' | 'minor' | 'major' | `${number}.${number}.${number}`

export function isBump(value: string): value is Bump {
  return value === 'patch' || value === 'minor' || value === 'major' || SEMVER.test(value)
}

function parse(version: string): [number, number, number] {
  const m = SEMVER.exec(version)
  if (!m) throw new Error(`not a version: ${version}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** greater than 0 when a > b */
function compare(a: string, b: string): number {
  const [x, y] = [parse(a), parse(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

/** The version after `current`; throws if `bump` isn't valid, doesn't move forward, or `v<next>` is a tag. */
export function nextVersion(current: string, bump: string, tags: readonly string[]): string {
  if (!isBump(bump)) throw new Error(`bump must be patch, minor, major or x.y.z, got "${bump}"`)
  const [major, minor, patch] = parse(current)
  const next =
    bump === 'major'
      ? `${major + 1}.0.0`
      : bump === 'minor'
        ? `${major}.${minor + 1}.0`
        : bump === 'patch'
          ? `${major}.${minor}.${patch + 1}`
          : bump
  if (compare(next, current) <= 0) throw new Error(`${next} isn't after the current version ${current}`)
  if (tags.includes(`v${next}`)) throw new Error(`tag v${next} already exists`)
  return next
}

/** `git ls-remote --tags` / `git tag -l` output -> tag names */
export function parseTags(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim().split(/\s+/).pop() ?? '')
    .map((ref) => ref.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, ''))
    .filter(Boolean)
}

export const PACKAGE_JSON = join(import.meta.dir, '..', 'package.json')

export function currentVersion(): string {
  return JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version
}

/** tags on origin (so a tag pushed since the last fetch counts too) */
export function remoteTags(): string[] {
  const res = spawnSync('git', ['ls-remote', '--tags', 'origin'], { encoding: 'utf8' })
  if (res.status !== 0) throw new Error(`git ls-remote failed: ${res.stderr.trim()}`)
  return parseTags(res.stdout)
}

if (import.meta.main) {
  try {
    const [bump = '', flag] = process.argv.slice(2)
    const next = nextVersion(currentVersion(), bump, remoteTags())
    if (flag === '--write') {
      const text = readFileSync(PACKAGE_JSON, 'utf8')
      writeFileSync(PACKAGE_JSON, text.replace(/("version":\s*")[^"]+(")/, `$1${next}$2`))
    }
    console.log(next)
  } catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
}
