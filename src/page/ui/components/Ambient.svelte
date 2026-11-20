<script lang="ts">
  import { fade } from 'svelte/transition'
  import { ambientStyle, type AmbientPalette } from '../ambient'

  interface Props {
    palette: AmbientPalette
  }

  let { palette }: Props = $props()
</script>

<!-- slowly drifting colour blobs; the base wash is the parent's background (no seam at its
     rounded corners). Fades in when shown, cross-fades on a new palette, leaves at once with
     its parent (the base wash switches instantly too). -->
{#key palette.join()}
  <div class="ambient" style={ambientStyle(palette)} in:fade|global={{ duration: 700 }} out:fade={{ duration: 700 }} aria-hidden="true">
    <span class="blob one"></span>
    <span class="blob two"></span>
    <span class="blob three"></span>
  </div>
{/key}

<style>
  .ambient {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .ambient {
    /* capped lightness: a near-white artwork colour would wash out the white text */
    --blob-1: color-mix(in oklab, oklch(from var(--ambient-1) min(l, 0.62) c h) var(--ambient-blob-mix), transparent);
    --blob-2: color-mix(in oklab, oklch(from var(--ambient-2) min(l, 0.62) c h) var(--ambient-blob-mix), transparent);
    --blob-3: color-mix(in oklab, oklch(from var(--ambient-3) min(l, 0.62) c h) var(--ambient-blob-mix), transparent);
  }
  .blob {
    position: absolute;
    aspect-ratio: 1;
    will-change: transform;
    animation: var(--duration) ease-in-out infinite alternate both;
  }
  .one {
    --duration: 19s;
    top: -28%;
    left: -38%;
    width: 120%;
    background: radial-gradient(closest-side, var(--blob-1), transparent);
    animation-name: drift-one;
  }
  .two {
    --duration: 25s;
    top: 18%;
    right: -55%;
    width: 130%;
    background: radial-gradient(closest-side, var(--blob-2), transparent);
    animation-name: drift-two;
  }
  .three {
    --duration: 31s;
    bottom: -40%;
    left: -30%;
    width: 125%;
    background: radial-gradient(closest-side, var(--blob-3), transparent);
    animation-name: drift-three;
  }
  @keyframes drift-one {
    to {
      transform: translate(38%, 22%) scale(1.2);
    }
  }
  @keyframes drift-two {
    to {
      transform: translate(-40%, 18%) scale(0.85);
    }
  }
  @keyframes drift-three {
    to {
      transform: translate(30%, -30%) scale(1.15);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .blob {
      animation: none;
    }
  }
</style>
