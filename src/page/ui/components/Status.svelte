<script lang="ts">
  import Spinner from './Spinner.svelte'

  interface Props {
    message?: string
    /** shows the spinner */
    loading?: boolean
    /** shows a "Try again" button */
    retry?: () => void
  }

  let { message, loading = false, retry }: Props = $props()
</script>

<div>
  {#if loading}<Spinner />{/if}
  {#if message}<p>{message}</p>{/if}
  {#if retry}<button onclick={retry}>Try again</button>{/if}
</div>

<style>
  div {
    padding: var(--space-5) 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
    color: var(--text-secondary);
  }
  button {
    padding: var(--space-1) var(--space-3);
    border: 0;
    border-radius: var(--radius-field);
    background: var(--bg-grouped);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
</style>
