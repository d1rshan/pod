<script lang="ts">
  interface Props {
    playing: boolean
    disabled?: boolean
    onprevious: () => void
    ontoggle: () => void
    onnext: () => void
  }

  let { playing, disabled = false, onprevious, ontoggle, onnext }: Props = $props()
</script>

<div class="transport">
  <button aria-label="Previous" {disabled} onclick={onprevious}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M19 6l-9 6 9 6z" /></svg>
  </button>
  <button class="play" aria-label={playing ? 'Pause' : 'Play'} {disabled} onclick={ontoggle}>
    {#if playing}
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
    {:else}
      <svg class="fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
    {/if}
  </button>
  <button aria-label="Next" {disabled} onclick={onnext}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14M5 6l9 6-9 6z" /></svg>
  </button>
</div>

<style>
  .transport {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-5);
  }
  button {
    display: grid;
    place-items: center;
    padding: var(--space-1);
    border: 0;
    background: none;
    color: var(--text);
    cursor: pointer;
  }
  button:active:not(:disabled) {
    opacity: 0.6;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .play {
    width: var(--size-button);
    height: var(--size-button);
    padding: 0;
    border-radius: 50%;
    background: var(--play-bg);
    color: var(--play-fg);
  }
  .play svg {
    width: 13px;
    height: 13px;
  }
  .play svg.fill {
    margin-left: 2px;
    fill: currentColor;
    stroke: none;
  }
</style>
