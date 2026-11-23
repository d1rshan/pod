<script lang="ts">
  interface Props {
    playing: boolean
    onclick: () => void
  }

  let { playing, onclick }: Props = $props()
</script>

<!-- play/pause at the end of the playing song's row -->
<button aria-label={playing ? 'Pause' : 'Play'} {onclick}>
  {#if playing}
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
  {:else}
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
  {/if}
</button>

<style>
  button {
    flex: none;
    width: var(--size-play);
    height: var(--size-play);
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--play-bg);
    color: var(--play-fg);
    cursor: pointer;
  }
  button:active {
    opacity: 0.6;
  }
</style>
