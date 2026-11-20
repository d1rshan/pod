<script lang="ts">
  import { nav } from '../../state/nav.svelte'
  import { player } from '../../state/player.svelte'
  import Artwork from '../components/Artwork.svelte'
  import ProgressBar from '../components/ProgressBar.svelte'
  import Status from '../components/Status.svelte'
  import Transport from '../components/Transport.svelte'

  /** px, matches the canvas */
  const ART_SIZE = 244
</script>

{#if player.current}
  {@const song = player.current}
  <section>
    <div class="art">
      <Artwork src={song.artwork} size={ART_SIZE} radius="var(--radius-art)" />
    </div>
    <div class="info">
      <h1 title={song.title}>{song.title}</h1>
      <p title={song.artist}>{song.artist}</p>
    </div>
    <ProgressBar
      time={player.time}
      duration={player.duration || song.durationMs / 1000}
      disabled={player.duration <= 0}
      onseek={(t) => player.seek(t)}
    />
    <Transport
      playing={player.playing}
      onprevious={() => player.previous()}
      ontoggle={() => player.toggle()}
      onnext={() => player.next()}
    />
    {#if player.error}<p class="error">{player.error}</p>{/if}
  </section>
{:else}
  <Status message="Nothing playing" />
  <div class="browse"><button onclick={() => nav.select('library')}>Browse your library</button></div>
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-top: var(--space-3);
  }
  .art {
    align-self: center;
    margin-bottom: var(--space-1);
    border-radius: var(--radius-art);
    box-shadow:
      0 20px 34px rgba(0, 0, 0, 0.32),
      0 8px 14px rgba(0, 0, 0, 0.18);
  }
  .info {
    min-width: 0;
  }
  h1,
  .info p {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  h1 {
    font-size: var(--text-name);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-name);
    line-height: 1.25;
  }
  .info p {
    margin-top: var(--space-0);
    color: var(--text-secondary);
  }
  .error {
    text-align: center;
    color: var(--accent);
  }
  .browse {
    display: flex;
    justify-content: center;
  }
  .browse button {
    padding: var(--space-1) var(--space-3);
    border: 0;
    border-radius: var(--radius-field);
    background: var(--bg-grouped);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
</style>
