<script lang="ts">
  import { onMount } from 'svelte'
  import { artworkUrl } from '../../music/artwork'
  import {
    ADJUST,
    advance,
    BLUR,
    fadeProgress,
    FPS,
    layout,
    LIFT,
    RESOLUTION,
    SHADE,
    twist,
    TWIST,
    type Angles
  } from '../artworkScene'

  interface Props {
    /** Apple artwork URL template */
    artwork: string
  }

  /** px: the cover only feeds a blur, a small image is plenty */
  const IMAGE_SIZE = 100

  let { artwork }: Props = $props()
  let canvas = $state<HTMLCanvasElement>()

  /** the cover fading in, and the one it replaces */
  let current: { img: HTMLImageElement; since: number } | undefined
  let previous: HTMLImageElement | undefined

  $effect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // the twist reads the pixels back
    img.decoding = 'async'
    img.src = artworkUrl(artwork, IMAGE_SIZE)
    let cancelled = false
    img.decode().then(
      () => {
        if (cancelled) return
        previous = current?.img
        current = { img, since: performance.now() }
      },
      (err) => console.warn('[pod] background artwork failed to load:', err)
    )
    return () => {
      cancelled = true
    }
  })

  onMount(() => {
    const view = canvas
    const ctx = view?.getContext('2d')
    if (!view || !ctx) return
    // the copies are drawn here, then blurred onto the view in one go (filters apply per draw)
    const layer = document.createElement('canvas')
    const layerCtx = layer.getContext('2d', { willReadFrequently: true })
    if (!layerCtx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let angles: Angles = [0, 0, 0, 0]
    let twisted: ImageData | undefined
    let last = performance.now()
    let frame = 0

    const size = (): void => {
      const { width, height } = view.getBoundingClientRect()
      view.width = Math.max(1, Math.round(width * RESOLUTION))
      view.height = Math.max(1, Math.round(height * RESOLUTION))
    }
    size()
    const resize = new ResizeObserver(size)
    resize.observe(view)

    const draw = (now: number): void => {
      const w = view.width
      const h = view.height
      const blur = BLUR * RESOLUTION
      // padded so the blur pulls in cover, not transparent edges
      const pad = Math.ceil(blur * 2)
      // resizing reallocates (and clears) the layer, so only when the size changed
      if (layer.width !== w + pad * 2 || layer.height !== h + pad * 2) {
        layer.width = w + pad * 2
        layer.height = h + pad * 2
      } else {
        layerCtx.clearRect(0, 0, layer.width, layer.height)
      }
      const sprites = layout(layer.width, layer.height, angles)
      const t = current ? fadeProgress(now, current.since) : 0
      if (t >= 1) previous = undefined
      for (const [img, alpha] of [
        [previous, 1 - t],
        [current?.img, previous ? t : 1]
      ] as const) {
        if (!img || alpha <= 0) continue
        layerCtx.globalAlpha = alpha
        for (const s of sprites) {
          layerCtx.setTransform(1, 0, 0, 1, s.x, s.y)
          layerCtx.rotate(s.rotation)
          layerCtx.drawImage(img, -s.size / 2, -s.size / 2, s.size, s.size)
        }
      }
      layerCtx.setTransform(1, 0, 0, 1, 0, 0)
      layerCtx.globalAlpha = 1

      // twist (apple's first filter) before the blur
      const lw = layer.width
      const lh = layer.height
      const src = layerCtx.getImageData(0, 0, lw, lh)
      if (twisted?.width !== lw || twisted.height !== lh) twisted = new ImageData(lw, lh)
      twist(src.data, twisted.data, lw, lh, lw / 2, lh / 2, TWIST.radius * RESOLUTION, TWIST.angle)
      layerCtx.putImageData(twisted, 0, 0)

      ctx.clearRect(0, 0, w, h)
      ctx.filter = `blur(${blur}px) ${ADJUST}`
      ctx.drawImage(layer, -pad, -pad)
      ctx.filter = 'none'
      ctx.fillStyle = SHADE
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = LIFT
      ctx.fillRect(0, 0, w, h)
    }

    const tick = (now: number): void => {
      frame = requestAnimationFrame(tick)
      const dt = now - last
      if (dt < 1000 / FPS - 2) return // capped: a frame every ~66ms
      last = now
      // after a hidden stretch (no frames), carry on instead of jumping ahead
      angles = advance(angles, Math.min(dt, 200), reducedMotion.matches)
      if (current) draw(now)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
    }
  })
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    animation: appear 0.6s ease-out;
  }
  @keyframes appear {
    from {
      opacity: 0;
    }
  }
</style>
