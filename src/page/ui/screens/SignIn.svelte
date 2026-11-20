<script lang="ts">
  import { auth } from '../../state/auth.svelte'

  const loading = $derived(auth.status === 'loading')
  const unavailable = $derived(auth.status === 'unavailable')
</script>

<section>
  <div class="hero">
    <div class="icon" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
    <h1>pod</h1>
    <p>
      {#if unavailable}
        Couldn't reach Apple Music
      {:else}
        Sign in to play your playlists
      {/if}
    </p>
  </div>

  {#if unavailable}
    <button onclick={() => location.reload()}>Try again</button>
  {:else}
    <button disabled={loading || auth.signingIn} onclick={() => auth.signIn()}>
      {#if loading}
        Loading…
      {:else if auth.signingIn}
        Signing in…
      {:else}
        Sign in with Apple Music
      {/if}
    </button>
  {/if}
  <small class:error={auth.error}>{auth.error ?? 'Requires an Apple Music subscription'}</small>
</section>

<style>
  section {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: var(--space-5);
    -webkit-app-region: drag;
  }
  .hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .icon {
    width: var(--size-icon);
    height: var(--size-icon);
    border-radius: var(--radius-icon);
    background: var(--bg-grouped);
    color: var(--accent);
    display: grid;
    place-items: center;
  }
  h1 {
    margin-top: var(--space-4);
    font-size: var(--text-title);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
  }
  p {
    margin-top: var(--space-1);
    color: var(--text-secondary);
  }
  button {
    -webkit-app-region: no-drag;
    width: 100%;
    height: var(--size-button);
    border: 0;
    border-radius: var(--radius-tabs);
    background: var(--play-bg);
    color: var(--play-fg);
    font: 500 var(--text-button) var(--font);
    cursor: pointer;
    transition: opacity 0.15s;
  }
  button:hover:not(:disabled) {
    opacity: 0.85;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  small {
    margin-top: var(--space-2);
    font-size: var(--text-small);
    color: var(--text-secondary);
    text-align: center;
  }
  small.error {
    color: var(--accent);
  }
</style>
