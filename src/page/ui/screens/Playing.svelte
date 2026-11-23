<script lang="ts">
  import { lyrics } from '../../state/lyrics.svelte'
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
      <div class="head">
        <div class="info">
          <h1 title={song.title}>{song.title}</h1>
          <p title={song.artist}>{song.artist}</p>
        </div>
        <!-- dimmed once we know the song has none (still tappable: the screen says so) -->
        <button
          class="lyrics"
          class:none={lyrics.status === 'none'}
          aria-label="Lyrics"
          title="Lyrics"
          onclick={() => nav.open({ name: 'lyrics' })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M8 9h8M8 12.5h5" />
          </svg>
        </button>
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
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .info {
    flex: 1;
    min-width: 0;
  }
  .lyrics {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--size-play);
    height: var(--size-play);
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--bg-grouped);
    color: var(--text);
    cursor: pointer;
    transition:
      transform 0.15s ease,
      opacity 0.15s ease;
  }
  .lyrics:active {
    transform: scale(0.88);
  }
  .lyrics.none {
    opacity: 0.4;
  }
  .lyrics svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
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
