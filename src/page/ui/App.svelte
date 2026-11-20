<script lang="ts">
  import { onMount } from 'svelte'
  import { formatTime } from '../../shared/format'
  import { auth } from '../state/auth.svelte'
  import { player } from '../state/player.svelte'
  import SignIn from './screens/SignIn.svelte'

  onMount(() => auth.start())

  $effect(() => {
    if (auth.status === 'signed-in') return player.start()
  })
</script>

{#if auth.status === 'signed-in'}
  <!-- placeholder until the tabs land (step 3); playback spike (step 2) -->
  <main>
    <h1>pod</h1>
    <p>{formatTime(player.time)} / {formatTime(player.duration)}</p>
    <div class="buttons">
      <button onclick={() => player.playTestSong()}>Play test song</button>
      <button onclick={() => player.toggle()}>{player.playing ? 'Pause' : 'Play'}</button>
    </div>
    {#if player.error}<p class="error">{player.error}</p>{/if}
  </main>
{:else}
  <SignIn />
{/if}

<style>
  main {
    height: 100%;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-2);
    -webkit-app-region: drag;
  }
  h1 {
    font-size: var(--text-title);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-title);
  }
  p {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .error {
    color: var(--accent);
  }
  .buttons {
    display: flex;
    gap: var(--space-2);
  }
  button {
    -webkit-app-region: no-drag;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-field);
    background: var(--play-bg);
    color: var(--play-fg);
    font: inherit;
    font-size: var(--text-button);
    font-weight: var(--weight-semibold);
    cursor: pointer;
  }
</style>
