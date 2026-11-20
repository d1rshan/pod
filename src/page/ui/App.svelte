<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { Screen } from '../state/navStack'
  import { auth } from '../state/auth.svelte'
  import { library } from '../state/library.svelte'
  import { nav } from '../state/nav.svelte'
  import { player } from '../state/player.svelte'
  import TabBar from './components/TabBar.svelte'
  import Discover from './screens/Discover.svelte'
  import Library from './screens/Library.svelte'
  import Playing from './screens/Playing.svelte'
  import Playlist from './screens/Playlist.svelte'
  import SignIn from './screens/SignIn.svelte'
  import { tintStyle } from './tint'

  onMount(() => auth.start())

  $effect(() => {
    if (auth.status === 'signed-in') return player.start()
  })

  // signing out (or in as someone else) starts fresh
  $effect(() => {
    if (auth.status === 'signed-out') {
      library.reset()
      nav.reset()
      player.error = undefined
    }
  })

  const screen = $derived(nav.screen)
  /** the playing screen takes the artwork's colour (tabs included) */
  const tint = $derived(screen.name === 'playing' ? tintStyle(player.color) : '')
  let scroller = $state<HTMLElement>()
  /** scroll position per stack entry: back/tab switch restores it, a new screen starts at the top */
  const scrollTops = new WeakMap<Screen, number>()

  $effect(() => {
    const shown = screen
    player.error = undefined // a playback error belongs to the screen it happened on
    void tick().then(() => {
      if (scroller && shown === nav.screen) scroller.scrollTop = scrollTops.get(shown) ?? 0
    })
  })
</script>

<!-- device frame: graphite bezel (drag handle) around the screen -->
<div class="device">
  <div class="screen">
    {#if auth.status === 'signed-in'}
      <div class="shell" class:tinted={tint !== ''} style={tint}>
        <header><TabBar /></header>
        <main bind:this={scroller} onscroll={() => scroller && scrollTops.set(screen, scroller.scrollTop)}>
          {#if screen.name === 'playing'}
            <Playing />
          {:else if screen.name === 'library'}
            <Library />
          {:else if screen.name === 'playlist'}
            {#key screen.playlist.id}
              <Playlist playlist={screen.playlist} />
            {/key}
          {:else}
            <Discover />
          {/if}
        </main>
      </div>
    {:else}
      <SignIn />
    {/if}
  </div>
</div>

<style>
  .device {
    height: 100%;
    padding: var(--size-bezel);
    border-radius: var(--radius-device);
    background: var(--frame-bg);
    box-shadow:
      inset 0 0 0 1px var(--frame-edge),
      inset 0 2px 1px var(--frame-highlight);
    -webkit-app-region: drag;
  }
  .screen {
    position: relative;
    height: 100%;
    overflow: hidden;
    border-radius: calc(var(--radius-device) - var(--size-bezel));
    background: var(--bg);
    box-shadow: 0 0 0 1px var(--frame-screen-edge);
    -webkit-app-region: no-drag;
  }
  .shell {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--text);
    background-color: var(--bg);
  }
  .shell.tinted {
    background-color: var(--tint);
    /* light from the top, falling off to near-black at the bottom */
    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 45%, rgba(0, 0, 0, 0.45) 100%);
  }
  header {
    flex: none;
    padding: var(--space-3) var(--space-4) 0;
    -webkit-app-region: drag;
  }
  main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-1) var(--space-4) var(--space-3);
    scrollbar-width: none;
  }
</style>
