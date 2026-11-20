<script lang="ts">
  import { nav } from '../../state/nav.svelte'
  import { TABS, type Tab } from '../../state/navStack'

  const LABELS: Record<Tab, string> = { playing: 'Playing', library: 'Library', discover: 'Discover' }
</script>

<nav>
  {#each TABS as tab (tab)}
    <button class:on={nav.tab === tab} aria-current={nav.tab === tab ? 'page' : undefined} onclick={() => nav.select(tab)}>
      {LABELS[tab]}
    </button>
  {/each}
</nav>

<style>
  nav {
    height: var(--size-tabs);
    display: flex;
    gap: var(--space-0);
    padding: var(--space-0);
    border-radius: var(--radius-tabs);
    background: var(--bg-grouped);
  }
  button {
    -webkit-app-region: no-drag;
    flex: 1;
    border: 0;
    border-radius: var(--radius-tab);
    background: none;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--text-body);
    cursor: pointer;
  }
  button.on {
    background: var(--bg-selected);
    color: var(--text);
    box-shadow: var(--shadow-selected);
  }
</style>
