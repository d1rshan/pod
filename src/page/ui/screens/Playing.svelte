<script lang="ts">
  import { nav } from '../../state/nav.svelte'
  import { player } from '../../state/player.svelte'
  import Artwork from '../components/Artwork.svelte'
  import ProgressBar from '../components/ProgressBar.svelte'
  import Status from '../components/Status.svelte'
  import Transport from '../components/Transport.svelte'

  /** px: image resolution for the cover (the inset content is ~264px wide) */
  const ART_SIZE = 280
</script>

{#if player.current}
  {@const song = player.current}
  <section>
    <!-- full size while playing, eases back when paused -->
    <div class="art" class:paused={!player.playing}>
      <Artwork src={song.artwork} size={ART_SIZE} radius="var(--radius-art)" fluid />
    </div>
    <div class="bottom">
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
    </div>
  </section>
{:else}
  <Status message="Nothing playing" />
  <div class="browse"><button onclick={() => nav.select('library')}>Browse your library</button></div>
{/if}

<style>
  section {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--space-3);
    /* inset beyond the screen padding: a smaller cover and room around everything */
    padding: var(--space-3) var(--space-3) var(--space-2);
  }
  .art {
    flex: none;
    border-radius: var(--radius-art);
    /* soft glow in the artwork colour (--ambient-0, set on the screen) + a tight contact shadow */
    box-shadow:
      0 18px 36px -14px color-mix(in oklab, var(--ambient-0, #000000) 75%, transparent),
      0 3px 10px -4px rgba(0, 0, 0, 0.22);
    transition:
      transform 0.55s cubic-bezier(0.32, 1.25, 0.5, 1),
      box-shadow 0.55s ease;
  }
  .art.paused {
    transform: scale(0.84);
    box-shadow:
      0 10px 22px -12px color-mix(in oklab, var(--ambient-0, #000000) 75%, transparent),
      0 2px 6px -3px rgba(0, 0, 0, 0.16);
  }
  .bottom {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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
  @media (prefers-reduced-motion: reduce) {
    .art {
      transition: none;
    }
  }
</style>
