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

<!-- solid icons, no button chrome (Apple Music style); the stroke rounds the triangles' corners -->
<div class="transport">
  <button class="skip" aria-label="Previous" {disabled} onclick={onprevious}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.5 6.5 2.5 12l9 5.5ZM21.5 6.5l-9 5.5 9 5.5Z" /></svg>
  </button>
  <button class="play" aria-label={playing ? 'Pause' : 'Play'} {disabled} onclick={ontoggle}>
    {#if playing}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="4" width="4.5" height="16" rx="1.3" />
        <rect x="14" y="4" width="4.5" height="16" rx="1.3" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 19.5 12 7 19.5Z" /></svg>
    {/if}
  </button>
  <button class="skip" aria-label="Next" {disabled} onclick={onnext}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.5l9 5.5-9 5.5ZM12.5 6.5l9 5.5-9 5.5Z" /></svg>
  </button>
</div>

<style>
  .transport {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
  }
  button {
    display: grid;
    place-items: center;
    padding: var(--space-1);
    border: 0;
    background: none;
    color: var(--text);
    cursor: pointer;
    transition:
      transform 0.15s ease,
      opacity 0.15s ease;
  }
  button:active:not(:disabled) {
    transform: scale(0.88);
    opacity: 0.6;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  svg {
    fill: currentColor;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .skip svg {
    width: 28px;
    height: 28px;
  }
  .play svg {
    width: 34px;
    height: 34px;
  }
  /* the bars have their own rounding */
  .play rect {
    stroke: none;
  }
</style>
