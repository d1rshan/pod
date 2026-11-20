<!-- placeholder until the real screens land (step 1+) -->
<main>
  <span class="dot"></span>
  <h1>pod</h1>
  <p>skeleton</p>
</main>

<style>
  main {
    height: 100%;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-2);
    -webkit-app-region: drag;
  }
  .dot {
    width: var(--space-3);
    height: var(--space-3);
    border-radius: var(--radius-small);
    background: var(--accent);
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
