<script lang="ts">
  import { formatTime } from '../../../shared/format'

  interface Props {
    /** seconds */
    time: number
    /** seconds (0 = unknown) */
    duration: number
    /** can't seek yet (e.g. the song hasn't loaded) */
    disabled?: boolean
    onseek: (time: number) => void
  }

  let { time, duration, disabled = false, onseek }: Props = $props()

  /** while dragging: where the thumb is (MusicKit's time is ignored until release) */
  let dragging = $state<number | undefined>()
  /** value at pointerdown: releasing on it fires no `change`, so the drag must end by hand */
  let startValue: number | undefined
  const shown = $derived(Math.min(dragging ?? time, duration))
  const pct = $derived(duration > 0 ? (shown / duration) * 100 : 0)
</script>

<div class="progress">
  <input
    type="range"
    min="0"
    max={duration || 1}
    step="0.1"
    value={shown}
    disabled={disabled || duration <= 0}
    aria-label="Position"
    aria-valuetext="{formatTime(shown)} of {formatTime(duration)}"
    style:--pct="{pct}%"
    onpointerdown={(e) => (startValue = e.currentTarget.valueAsNumber)}
    onpointerup={(e) => {
      if (e.currentTarget.valueAsNumber === startValue) dragging = undefined
    }}
    onpointercancel={() => (dragging = undefined)}
    onblur={() => (dragging = undefined)}
    oninput={(e) => (dragging = e.currentTarget.valueAsNumber)}
    onchange={(e) => {
      dragging = undefined
      onseek(e.currentTarget.valueAsNumber)
    }}
  />
  <div class="times">
    <span>{formatTime(shown)}</span>
    <span>{formatTime(duration)}</span>
  </div>
</div>

<style>
  input {
    --height: 3px;
    display: block;
    width: 100%;
    height: 14px;
    margin: 0;
    background: none;
    appearance: none;
    cursor: pointer;
  }
  input:disabled {
    cursor: default;
  }
  input::-webkit-slider-runnable-track {
    height: var(--height);
    border-radius: var(--radius-small);
    background: linear-gradient(to right, var(--progress) var(--pct), var(--track) var(--pct));
  }
  input::-webkit-slider-thumb {
    width: 9px;
    height: 9px;
    margin-top: calc((var(--height) - 9px) / 2);
    border-radius: 50%;
    background: var(--progress);
    appearance: none;
    opacity: 0;
    transition: opacity 0.15s;
  }
  input:not(:disabled):hover::-webkit-slider-thumb,
  input:focus-visible::-webkit-slider-thumb,
  input:active::-webkit-slider-thumb {
    opacity: 1;
  }
  input:focus-visible {
    outline: none;
  }
  .times {
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
    font-size: var(--text-small);
    font-variant-numeric: tabular-nums;
  }
</style>
