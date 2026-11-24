// Cuts a release through CI: `bun run release patch|minor|major|x.y.z`.
// Checks main is clean and pushed and `gh` is signed in, triggers .github/workflows/release.yml,
// watches it, prints the release URL. The bump commit is made by the workflow's bot.
// `bun run release build`: the same builds (all OSes, VMP-signed) without a bump, tag or release;
// prints the run page, where they're downloadable (Artifacts, kept 7 days).
import { spawnSync } from 'node:child_process'
import { currentVersion, isBump, nextVersion, remoteTags } from './version'

const WORKFLOW = 'release.yml'
const RUN_APPEAR_TIMEOUT_MS = 60_000

const BUILD = 'build'

/** the workflow's `run-name` for this run (scripts/release.ts and release.yml must agree) */
const runTitle = (bump: string): string => (bump === BUILD ? 'build only' : `release ${bump}`)

function run(cmd: string, args: string[]): string {
  const res = spawnSync(cmd, args, { encoding: 'utf8' })
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed:\n${(res.stderr || res.stdout).trim()}`)
  return res.stdout.trim()
}

function fail(message: string): never {
  console.error(`release: ${message}`)
  process.exit(1)
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

async function main(): Promise<void> {
  const bump = process.argv[2] ?? ''
  const buildOnly = bump === BUILD
  if (!buildOnly && !isBump(bump)) fail('usage: bun run release patch|minor|major|x.y.z|build')

  if (run('git', ['branch', '--show-current']) !== 'main') fail('not on main')
  if (run('git', ['status', '--porcelain'])) fail('working tree not clean')
  run('git', ['fetch', 'origin', 'main'])
  if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/main'])) {
    fail('main and origin/main differ (push or pull first)')
  }
  if (spawnSync('gh', ['auth', 'status'], { stdio: 'ignore' }).status !== 0) fail('gh not signed in (gh auth login)')

  // same check the workflow does, so a bad bump fails here instead of in CI
  let version = currentVersion()
  if (!buildOnly) {
    try {
      version = nextVersion(version, bump, remoteTags())
    } catch (err) {
      fail((err as Error).message)
    }
  }

  // only release runs: a build_only run of the same workflow may be going on alongside
  const latestRunId = (): number => {
    const runs = JSON.parse(
      run('gh', ['run', 'list', '--workflow', WORKFLOW, '--event', 'workflow_dispatch', '--limit', '20', '--json', 'databaseId,displayTitle'])
    ) as { databaseId: number; displayTitle: string }[]
    return runs.find((r) => r.displayTitle === runTitle(bump))?.databaseId ?? 0
  }
  const before = latestRunId()
  const inputs = buildOnly ? ['-f', 'build_only=true'] : ['-f', `bump=${bump}`]
  run('gh', ['workflow', 'run', WORKFLOW, '--ref', 'main', ...inputs])
  console.log(`release: ${buildOnly ? `build of v${version}` : `v${version}`} triggered, waiting for the run...`)

  // `gh workflow run` doesn't return the run id: wait for a dispatch run newer than the last one
  const since = Date.now()
  let runId = before
  while (runId === before) {
    if (Date.now() - since > RUN_APPEAR_TIMEOUT_MS) fail('the workflow run never showed up (see the Actions tab)')
    await sleep(3000)
    runId = latestRunId()
  }

  const watch = spawnSync('gh', ['run', 'watch', String(runId), '--exit-status'], { stdio: 'inherit' })
  if (watch.status !== 0) fail(`run ${runId} failed: gh run view ${runId} --log-failed`)

  if (buildOnly) {
    // not downloaded here (~450MB): testers grab their OS's zip from the run page
    const url = run('gh', ['run', 'view', String(runId), '--json', 'url', '-q', '.url'])
    console.log(`\nrelease: built, download from Artifacts at ${url} (kept 7 days)`)
    return
  }

  // the latest release, not v${version}: CI bumps from origin/main, which may have moved since
  const url = run('gh', ['release', 'view', '--json', 'url', '-q', '.url'])
  console.log(`\nrelease: published ${url}`)
  console.log('release: the bump commit is the bot\'s, run `git pull`')
}

main().catch((err) => fail((err as Error).message))
