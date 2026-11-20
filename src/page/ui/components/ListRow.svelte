<script lang="ts">
  import type { Snippet } from 'svelte'
  import Artwork from './Artwork.svelte'

  interface Props {
    title: string
    subtitle?: string
    artwork?: string
    /** shows a chevron: the row opens another screen */
    chevron?: boolean
    /** highlighted (e.g. the song that's playing) */
    active?: boolean
    /** controls at the end of the row, outside the row's own button */
    trailing?: Snippet
    onclick: () => void
  }

  /** px, matches the canvas */
  const THUMB_SIZE = 40

  let { title, subtitle, artwork, chevron = false, active = false, trailing, onclick }: Props = $props()
</script>

<div class="row" class:active>
  <button class="main" aria-current={active ? 'true' : undefined} {onclick}>
    <Artwork src={artwork} size={THUMB_SIZE} />
    <span class="text">
      <span class="title">{title}</span>
      {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
    </span>
    {#if chevron}
      <svg class="chevron" width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M1.5 1.5 6.5 6.5 1.5 11.5" />
      </svg>
    {/if}
  </button>
  {#if trailing}{@render trailing()}{/if}
</div>

<style>
  .row {
    min-height: var(--size-row);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-bottom: 1px solid var(--separator);
  }
  .row.active {
    margin: 0 calc(-1 * var(--space-2));
    padding: 0 var(--space-2);
    border-bottom-color: transparent;
    border-radius: var(--radius-tabs);
    background: var(--bg-grouped);
  }
  .main {
    flex: 1;
    min-width: 0;
    align-self: stretch;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .main:active {
    opacity: 0.6;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }
  .title,
  .subtitle {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .title {
    font-size: var(--text-body);
    font-weight: var(--weight-semibold);
  }
  .active .title {
    font-weight: var(--weight-bold);
  }
  .subtitle {
    font-size: var(--text-small);
    color: var(--text-secondary);
  }
  .chevron {
    flex: none;
    color: var(--text-tertiary);
  }
</style>
