<script lang="ts">
  // iOS-style activity indicator: 8 bars around a circle, the bright spot stepping clockwise.
  interface Props {
    /** px */
    size?: number
    label?: string
  }

  let { size = 20, label = 'Loading' }: Props = $props()

  const BARS = 8
</script>

<span class="spinner" role="status" aria-label={label} style:width="{size}px" style:height="{size}px">
  {#each { length: BARS }, i (i)}
    <i style:transform="rotate({(360 / BARS) * i}deg)" style:animation-delay="{-(BARS - i) / BARS}s"></i>
  {/each}
</span>

<style>
  .spinner {
    position: relative;
    display: inline-block;
    flex: none;
    color: inherit;
  }
  i {
    position: absolute;
    left: 50%;
    top: 0;
    width: 12%;
    height: 30%;
    margin-left: -6%;
    border-radius: 99px;
    background: currentColor;
    transform-origin: 50% 166.67%;
    opacity: 0.25;
    animation: fade 1s steps(8, end) infinite;
  }
  @keyframes fade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0.25;
    }
  }
</style>
