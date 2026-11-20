<script lang="ts">
  import { formatTime } from '../../../shared/format'
  import { player } from '../../state/player.svelte'
</script>

<!-- placeholder until the playing screen lands (step 4) -->
<section>
  <p>{formatTime(player.time)} / {formatTime(player.duration)}</p>
  <button onclick={() => player.toggle()}>{player.playing ? 'Pause' : 'Play'}</button>
  {#if player.error}<p class="error">{player.error}</p>{/if}
</section>

<style>
  section {
    height: 100%;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-2);
  }
  p {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .error {
    color: var(--accent);
  }
  button {
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
