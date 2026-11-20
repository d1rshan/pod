<script lang="ts">
  import { onMount } from 'svelte'
  import { library } from '../../state/library.svelte'
  import { nav } from '../../state/nav.svelte'
  import ListRow from '../components/ListRow.svelte'
  import Status from '../components/Status.svelte'

  const playlists = $derived(library.playlists)

  onMount(() => {
    if (!library.playlists.data && !library.playlists.loading) void library.loadPlaylists()
  })
</script>

<h1>Library</h1>

{#if playlists.data?.length}
  <ul>
    {#each playlists.data as playlist (playlist.id)}
      <li>
        <ListRow
          title={playlist.name}
          subtitle="Playlist"
          artwork={playlist.artwork}
          chevron
          onclick={() => nav.open({ name: 'playlist', playlist })}
        />
      </li>
    {/each}
  </ul>
{/if}

{#if playlists.error}
  <Status message={playlists.error} retry={() => library.loadPlaylists()} />
{:else if !playlists.data}
  <Status message="Loading…" />
{:else if playlists.data.length === 0}
  <Status message="No playlists in your library yet" />
{/if}

<style>
  h1 {
    margin: var(--space-3) 0;
    font-size: var(--text-title);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-title);
  }
  ul {
    padding: 0;
    list-style: none;
  }
</style>
