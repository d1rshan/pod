// castLabs VMP signing (Widevine on macOS/Windows refuses licences for unsigned apps), run by
// electron-builder hooks: macOS signs BEFORE code signing (afterPack), Windows AFTER (afterSign).
// Linux isn't VMP-signed. Needs `castlabs-evs` (pip) signed in: see .github/workflows/release.yml.
const { spawnSync } = require('node:child_process')

/** the hook that VMP-signs on `platform` (electron-builder's electronPlatformName), or null */
function vmpHook(platform) {
  if (platform === 'darwin') return 'afterPack'
  if (platform === 'win32') return 'afterSign'
  return null
}

function evs(args) {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  const res = spawnSync(python, ['-m', 'castlabs_evs.vmp', ...args], { stdio: 'inherit' })
  if (res.status !== 0) throw new Error(`castlabs_evs.vmp ${args[0]} failed (exit ${res.status ?? res.error})`)
}

/** signs + verifies the packaged app dir if `hook` is this platform's VMP stage */
function vmpSign(hook, context) {
  if (vmpHook(context.electronPlatformName) !== hook) return
  console.log(`[vmp] signing ${context.appOutDir}`)
  evs(['sign-pkg', context.appOutDir])
  evs(['verify-pkg', context.appOutDir])
}

module.exports = { vmpHook, vmpSign }
