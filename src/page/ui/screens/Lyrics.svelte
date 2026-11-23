<script lang="ts">
  import { lyrics } from '../../state/lyrics.svelte'
  import { nav } from '../../state/nav.svelte'
  import { player } from '../../state/player.svelte'
  import Artwork from '../components/Artwork.svelte'
  import BackLink from '../components/BackLink.svelte'
  import LyricsView from '../components/LyricsView.svelte'
  import ProgressBar from '../components/ProgressBar.svelte'
  import Status from '../components/Status.svelte'
  import Transport from '../components/Transport.svelte'

  /** px: the small cover next to the title */
  const ART_SIZE = 44
</script>

<section>
  <div class="top">
    <BackLink label="Now Playing" onclick={() => nav.back()} />
    {#if player.current}
      {@const song = player.current}
      <div class="song">
        <Artwork src={song.artwork} size={ART_SIZE} />
        <div class="info">
          <h1 title={song.title}>{song.title}</h1>
          <p title={song.artist}>{song.artist}</p>
        </div>
      </div>
    {/if}
  </div>

  <div class="body">
    {#if !player.current}
      <Status message="Nothing playing" />
    {:else if lyrics.status === 'ready' && lyrics.lyrics}
      {#key lyrics.lyrics}<LyricsView lyrics={lyrics.lyrics} />{/key}
    {:else if lyrics.status === 'error'}
      <Status message="Couldn't load lyrics." retry={() => lyrics.retry()} />
    {:else if lyrics.status === 'none'}
      <Status message="No lyrics for this song" />
    {:else}
      <Status loading />
    {/if}
  </div>

  {#if player.current}
    <div class="bottom">
      <ProgressBar
        time={player.time}
        duration={player.duration || player.current.durationMs / 1000}
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
  {/if}
</section>

<style>
  section {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .top {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .song {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-width: 0;
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
    font-size: var(--text-button);
    font-weight: var(--weight-bold);
    line-height: 1.3;
  }
  .info p {
    color: var(--text-secondary);
  }
  .body {
    flex: 1;
    min-height: 0;
    /* the view spans the screen so blur and glow aren't clipped; it pads its lines back in */
    margin: 0 calc(-1 * var(--space-4));
  }
  .bottom {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .error {
    text-align: center;
    color: var(--accent);
  }
</style>
