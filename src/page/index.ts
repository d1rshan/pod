// Entry of the bundle main injects into music.apple.com (main world, after dom-ready).
// Re-running it (dev reload) tears down the previous instance first.
import { mount, unmount } from 'svelte'
import App from './ui/App.svelte'
import tokens from './ui/styles/tokens.css?inline'
// Inter variable (latin, OFL): Apple's CSP allows fonts only from apple.com or data:, so it's inlined
import interWoff2 from './ui/styles/fonts/inter-latin-wght.woff2?inline'

const HOST_ID = 'pod-root'

// Apple's DOM stays alive for MusicKit, just hidden (spec: hidden, not deleted).
const HIDE_APPLE_CSS = `
  body > :not(#${HOST_ID}) { display: none !important; }
  #${HOST_ID} { position: fixed; inset: 0; z-index: 2147483647; }
`

// @font-face is ignored inside a shadow root, so it lives in the document
const FONT_CSS = `
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 100 900;
    font-display: block;
    src: url(${interWoff2}) format('woff2');
  }
`

function inject(): void {
  window.__pod?.destroy()
  // leftovers from a run that threw before registering itself
  document.querySelectorAll(`#${HOST_ID}, style[data-pod]`).forEach((el) => el.remove())

  const host = document.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })
  const tokenStyle = document.createElement('style')
  tokenStyle.textContent = tokens
  const target = document.createElement('div')
  target.className = 'pod'
  shadow.append(tokenStyle, target)

  const hideStyle = document.createElement('style')
  hideStyle.dataset['pod'] = ''
  hideStyle.textContent = HIDE_APPLE_CSS
  const fontStyle = document.createElement('style')
  fontStyle.dataset['pod'] = ''
  fontStyle.textContent = FONT_CSS

  let app: ReturnType<typeof mount> | undefined
  const destroy = (): void => {
    if (app) void unmount(app)
    host.remove()
    hideStyle.remove()
    fontStyle.remove()
    if (window.__pod?.destroy === destroy) delete window.__pod
  }
  window.__pod = { destroy }

  try {
    document.head.append(fontStyle)
    document.body.append(host)
    app = mount(App, { target })
  } catch (err) {
    destroy() // leave Apple's page visible rather than blank
    throw err
  }
  // only hide Apple once our UI is mounted
  document.head.append(hideStyle)
}

inject()
