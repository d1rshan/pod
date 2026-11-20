import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build, type InlineConfig, type Plugin } from 'vite'

const PAGE_OUT_DIR = 'out/page'

// Dev: touched after every page rebuild has fully written index.js; main watches it
// to re-inject (watching index.js itself can catch a half-written file).
function builtMarker(): Plugin {
  return {
    name: 'pod:page-built-marker',
    writeBundle() {
      writeFileSync(join(PAGE_OUT_DIR, '.built'), String(Date.now()))
    }
  }
}

// The page bundle (src/page) is injected into music.apple.com by main, so it's a
// single IIFE file instead of an electron-vite renderer. Main's build drives it:
// a one-off build for `electron-vite build`, a watch build for `electron-vite dev`.
function pageConfig(dev: boolean): InlineConfig {
  return {
    configFile: false,
    mode: dev ? 'development' : 'production',
    plugins: [svelte({ compilerOptions: { css: 'injected' } }), ...(dev ? [builtMarker()] : [])],
    define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
    logLevel: 'warn',
    build: {
      outDir: PAGE_OUT_DIR,
      // emptying on every watch rebuild would delete index.js under main's feet
      emptyOutDir: !dev,
      lib: { entry: 'src/page/index.ts', formats: ['iife'], name: 'podPage', fileName: () => 'index.js' },
      minify: !dev,
      sourcemap: dev ? 'inline' : false,
      watch: dev ? {} : null
    }
  }
}

function pageBundle(): Plugin {
  let started = false
  return {
    name: 'pod:page-bundle',
    async buildStart() {
      if (started) return
      started = true
      const dev = process.env['NODE_ENV_ELECTRON_VITE'] === 'development'
      const result = await build(pageConfig(dev))
      if (!dev || !('on' in result)) return
      // watch mode: wait for the first build so main can inject it on startup
      await new Promise<void>((resolve) => {
        result.on('event', (e) => {
          if (e.code === 'END' || e.code === 'ERROR') resolve()
          if (e.code === 'ERROR') console.error(e.error)
          if ('result' in e) e.result?.close()
        })
      })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), pageBundle()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  }
})
