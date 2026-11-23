<script lang="ts">
  import { untrack } from 'svelte'
  import { currentIndex } from '../../music/player'
  import type { Playlist } from '../../music/types'
  import { library } from '../../state/library.svelte'
  import { nav } from '../../state/nav.svelte'
  import { player } from '../../state/player.svelte'
  import Artwork from '../components/Artwork.svelte'
  import BackLink from '../components/BackLink.svelte'
  import ListRow from '../components/ListRow.svelte'
  import RowToggle from '../components/RowToggle.svelte'
  import Status from '../components/Status.svelte'

  interface Props {
    playlist: Playlist
  }

  /** px, matches the canvas */
  const COVER_SIZE = 96

  let { playlist }: Props = $props()

  const tracks = $derived(library.tracks[playlist.id] ?? { loading: true })
  /** the playing song's row, only while the queue is this playlist */
  const activeIndex = $derived.by(() => {
    const song = player.current
    if (!song || player.playlistId !== playlist.id || !tracks.data) return -1
    return currentIndex(
      tracks.data.map((t) => t.id),
      song.id,
      player.position
    )
  })
  const count = $derived(tracks.data ? `${tracks.data.length} ${tracks.data.length === 1 ? 'song' : 'songs'}` : '')

  // refresh on open (cached tracks stay visible meanwhile)
  $effect(() => {
    const id = playlist.id
    untrack(() => void library.loadTracks(id))
  })
</script>

<BackLink label="Library" onclick={() => nav.back()} />

<header>
  <Artwork src={playlist.artwork} size={COVER_SIZE} radius="var(--radius-art)" />
  <div class="info">
    <h1>{playlist.name}</h1>
    <p>{count}</p>
    <button class="play" aria-label="Play" disabled={!tracks.data?.length} onclick={() => player.playPlaylist(playlist.id)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
    </button>
  </div>
</header>

{#snippet toggle()}<RowToggle playing={player.playing} onclick={() => player.toggle()} />{/snippet}

{#if player.error}<p class="error">{player.error}</p>{/if}

{#if tracks.data?.length}
  <ol>
    {#each tracks.data as track, i (`${i}:${track.id}`)}
      {@const active = i === activeIndex}
      <li>
        <ListRow
          title={track.title}
          subtitle={track.artist}
          artwork={track.artwork}
          {active}
          trailing={active ? toggle : undefined}
          onclick={() => (active ? player.toggle() : player.playPlaylist(playlist.id, i, track.id))}
        />
      </li>
    {/each}
  </ol>
{/if}

{#if tracks.error}
  <Status message={tracks.error} retry={() => library.loadTracks(playlist.id)} />
{:else if !tracks.data}
  <Status loading />
{:else if tracks.data.length === 0}
  <Status message="This playlist is empty" />
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-2) 0 var(--space-3);
  }
  .info {
    min-width: 0;
  }
  h1 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: var(--text-title);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-title);
    line-height: 1.1;
  }
  p {
    margin-top: var(--space-1);
    color: var(--text-secondary);
  }
  .play {
    margin-top: var(--space-2);
    width: var(--size-play);
    height: var(--size-play);
    display: grid;
    place-items: center;
    padding: 0 0 0 2px;
    border: 0;
    border-radius: 50%;
    background: var(--play-bg);
    color: var(--play-fg);
    cursor: pointer;
  }
  .play:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .error {
    margin-bottom: var(--space-2);
    color: var(--accent);
  }
  ol {
    padding: 0;
    list-style: none;
  }
</style>
