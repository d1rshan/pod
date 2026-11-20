<script lang="ts">
  import { artworkUrl } from '../../music/artwork'

  interface Props {
    /** Apple artwork URL template; a placeholder is shown without one */
    src?: string
    /** CSS pixels (square) */
    size: number
    radius?: string
  }

  let { src, size, radius = 'var(--radius-thumb)' }: Props = $props()
  let failed = $state(false)

  const url = $derived(src ? artworkUrl(src, size * Math.min(window.devicePixelRatio || 1, 2)) : undefined)
  $effect(() => {
    void url
    failed = false
  })
</script>

<div class="art" style:width="{size}px" style:height="{size}px" style:border-radius={radius}>
  {#if url && !failed}
    <img src={url} alt="" loading="lazy" decoding="async" onerror={() => (failed = true)} />
  {:else}
    <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  {/if}
</div>

<style>
  .art {
    flex: none;
    overflow: hidden;
    background: var(--bg-grouped);
    color: var(--text-tertiary);
    display: grid;
    place-items: center;
  }
  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
</style>
