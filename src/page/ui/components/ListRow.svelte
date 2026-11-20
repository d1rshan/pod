<script lang="ts">
  import Artwork from './Artwork.svelte'

  interface Props {
    title: string
    subtitle?: string
    artwork?: string
    /** shows a chevron: the row opens another screen */
    chevron?: boolean
    onclick: () => void
  }

  /** px, matches the canvas */
  const THUMB_SIZE = 40

  let { title, subtitle, artwork, chevron = false, onclick }: Props = $props()
</script>

<button class="row" {onclick}>
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

<style>
  .row {
    width: 100%;
    min-height: var(--size-row);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    border: 0;
    border-bottom: 1px solid var(--separator);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row:active {
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
  .subtitle {
    font-size: var(--text-small);
    color: var(--text-secondary);
  }
  .chevron {
    flex: none;
    color: var(--text-tertiary);
  }
</style>
