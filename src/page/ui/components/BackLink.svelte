<script lang="ts">
  interface Props {
    label: string
    onclick: () => void
  }

  let { label, onclick }: Props = $props()
</script>

<button {onclick}>
  <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 1 1 5l4 4" />
  </svg>
  {label}
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) 0;
    border: 0;
    background: none;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--text-body);
    cursor: pointer;
  }
  button:hover {
    color: var(--text);
  }
</style>
