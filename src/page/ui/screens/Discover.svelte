<script lang="ts">
  import { onMount } from 'svelte'
  import { player } from '../../state/player.svelte'
  import { search } from '../../state/search.svelte'
  import ListRow from '../components/ListRow.svelte'
  import RowToggle from '../components/RowToggle.svelte'
  import Status from '../components/Status.svelte'

  let field = $state<HTMLInputElement>()

  const results = $derived(search.results)
  /** the playing song's row (results are catalog songs: their id is the catalog id) */
  const activeIndex = $derived.by(() => {
    const id = player.current?.catalogId
    return id && results.data ? results.data.findIndex((t) => t.id === id) : -1
  })

  // ready to type when there's nothing searched yet
  onMount(() => {
    if (!search.term) field?.focus()
  })

  function onkeydown(e: KeyboardEvent): void {
    if (e.isComposing) return // enter/escape belong to the IME then
    if (e.key === 'Enter') void search.run()
    else if (e.key === 'Escape') search.clear()
  }
</script>

<h1>Discover</h1>

<label class="field">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
  <input
    bind:this={field}
    type="text"
    placeholder="Search songs, artists"
    aria-label="Search songs"
    spellcheck="false"
    autocomplete="off"
    value={search.term}
    oninput={(e) => search.input(e.currentTarget.value)}
    {onkeydown}
  />
  {#if search.term}
    <button
      class="clear"
      aria-label="Clear search"
      onclick={() => {
        search.clear()
        field?.focus()
      }}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  {/if}
</label>

{#snippet toggle()}<RowToggle playing={player.playing} onclick={() => player.toggle()} />{/snippet}

{#if player.error}<p class="error">{player.error}</p>{/if}

{#if results.data?.length}
  <ol class:stale={results.loading}>
    {#each results.data as track, i (`${i}:${track.id}`)}
      {@const active = i === activeIndex}
      <li>
        <ListRow
          title={track.title}
          subtitle={track.artist}
          artwork={track.artwork}
          {active}
          trailing={active ? toggle : undefined}
          onclick={() => (active ? player.toggle() : player.playSong(track.id))}
        />
      </li>
    {/each}
  </ol>
{/if}

{#if results.error}
  <Status message={results.error} retry={() => search.run()} />
{:else if !search.searched}
  <Status message="Find any song on Apple Music" />
{:else if results.loading && !results.data?.length}
  <Status loading />
{:else if results.data?.length === 0}
  <Status message={`No songs found for “${search.searched}”`} />
{/if}

<style>
  h1 {
    margin: var(--space-3) 0;
    font-size: var(--text-title);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-title);
  }
  .field {
    height: var(--size-tabs);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    padding: 0 var(--space-2) 0 var(--space-3);
    border-radius: var(--radius-field);
    background: var(--bg-grouped);
    color: var(--text-secondary);
    cursor: text;
  }
  .field svg {
    flex: none;
  }
  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: var(--text-body);
  }
  input::placeholder {
    color: var(--text-secondary);
  }
  .clear {
    flex: none;
    width: var(--size-clear);
    height: var(--size-clear);
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--text-tertiary);
    color: var(--bg-grouped);
    cursor: pointer;
  }
  .error {
    margin-bottom: var(--space-2);
    color: var(--accent);
  }
  ol {
    padding: 0;
    list-style: none;
    transition: opacity 0.15s ease;
  }
  /* a newer search is on its way */
  ol.stale {
    opacity: 0.5;
  }
</style>
