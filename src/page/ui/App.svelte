<script lang="ts">
  import { onMount } from 'svelte'
  import { auth } from '../state/auth.svelte'
  import SignIn from './screens/SignIn.svelte'

  onMount(() => auth.start())
</script>

{#if auth.status === 'signed-in'}
  <!-- placeholder until the tabs land (step 3) -->
  <main>
    <h1>pod</h1>
    <p>signed in</p>
  </main>
{:else}
  <SignIn />
{/if}

<style>
  main {
    height: 100%;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-2);
    -webkit-app-region: drag;
  }
  h1 {
    font-size: var(--text-title);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-title);
  }
  p {
    color: var(--text-secondary);
  }
</style>
