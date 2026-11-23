<script lang="ts">
  import { onMount } from 'svelte'
  import { activeLines, words, type Lyrics, type Syllable } from '../../music/lyrics'
  import { player } from '../../state/player.svelte'
  import {
    dotOpacity,
    emphasisLetters,
    INSTRUMENTAL_ENDING,
    letterMotion,
    scrollAt,
    SEEK_JUMP,
    syllableMotion,
    USER_SCROLL_MS
  } from '../lyricsMotion'

  interface Props {
    lyrics: Lyrics
  }

  /** px from the top of the view to the current line (apple's 55px, scaled to our type) */
  const CURRENT_TOP = 36

  let { lyrics }: Props = $props()

  interface Piece {
    s: Syllable
    /** set for an emphasised syllable: sung letter by letter */
    letters?: string[]
  }
  /** what the template draws: lines split into words, emphasised syllables into letters */
  const lines = $derived(
    lyrics.lines.map((line) => {
      if (line.kind === 'instrumental') return { line, words: [], background: [] }
      const piece = (s: Syllable): Piece => ({ s, letters: emphasisLetters(s) })
      return {
        line,
        words: words(line.syllables).map((w) => w.map(piece)),
        background: words(line.background).map((w) => w.map(piece))
      }
    })
  )
  /** index of the first sung line: it isn't blurred before it starts */
  const firstSung = $derived(lyrics.lines.findIndex((l) => l.kind === 'sung'))

  let scroller = $state<HTMLElement>()
  let height = $state(0)
  const lineEls: HTMLElement[] = []
  /** lines being sung (overlapping duet lines can be sung together), ascending */
  let active = $state<number[]>([])
  /** the latest of them: what the view scrolls to (-1 before the first line) */
  const current = $derived(active[active.length - 1] ?? -1)
  /** auto: follows the song; user: the user scrolled, leave it alone for a while */
  let mode = $state<'auto' | 'user'>('auto')
  /** the current instrumental line is about to end (its dots swell) */
  let ending = $state(false)

  let userTimer: ReturnType<typeof setTimeout> | undefined
  /** an eased scroll in flight; the target is re-read each frame (lines above may still be resizing) */
  let scroll: { from: number; start: number } | undefined

  function targetTop(i: number): number {
    const view = scroller
    const el = lineEls[i]
    if (!view || i < 0 || !el) return 0
    return Math.max(0, Math.min(el.offsetTop - CURRENT_TOP, view.scrollHeight - view.clientHeight))
  }

  function scrollToCurrent(animate: boolean): void {
    if (!scroller) return
    if (animate) scroll = { from: scroller.scrollTop, start: performance.now() }
    else {
      scroll = undefined
      scroller.scrollTop = targetTop(current)
    }
  }

  /** wheel / touch / keys: the user is looking around; auto-scroll comes back after a pause */
  function userScrolled(): void {
    mode = 'user'
    scroll = undefined
    clearTimeout(userTimer)
    userTimer = setTimeout(backToAuto, USER_SCROLL_MS)
  }

  function backToAuto(): void {
    clearTimeout(userTimer)
    if (mode === 'auto') return
    mode = 'auto'
    scrollToCurrent(true)
  }

  function onKey(e: KeyboardEvent): void {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) userScrolled()
  }

  /** a word's animated elements, in syllable order (line, then background vocals) */
  type Target =
    | { s: Syllable; el: HTMLElement; letters?: undefined; last?: string }
    | { s: Syllable; el: HTMLElement; letters: HTMLElement[]; last?: string }
  let targets: Target[] = []
  let dots: HTMLElement[] = []

  function collect(indices: readonly number[]): void {
    targets = []
    dots = []
    for (const i of indices) {
      const el = lineEls[i]
      const line = lyrics.lines[i]
      if (!el || !line) continue
      if (line.kind === 'instrumental') {
        dots = [...el.querySelectorAll<HTMLElement>('.dot')]
        continue
      }
      const syllables = [...line.syllables, ...line.background]
      el.querySelectorAll<HTMLElement>('.syl').forEach((sylEl, k) => {
        const s = syllables[k]
        if (!s) return
        targets.push(sylEl.classList.contains('emph') ? { s, el: sylEl, letters: [...sylEl.querySelectorAll<HTMLElement>('.letter')] } : { s, el: sylEl })
      })
    }
  }

  /** writes this frame's word fill / lift (only the active lines move) */
  function animate(t: number): void {
    for (const target of targets) {
      const { s, el, letters } = target
      // past and future syllables don't change: skip their writes
      const key = t < s.begin ? 'before' : t > s.end + 1.1 ? 'after' : undefined
      if (key && target.last === key) continue
      target.last = key
      if (!letters) {
        const m = syllableMotion(s, t)
        el.style.setProperty('--fill', `${m.fill}%`)
        el.style.setProperty('--y', `${m.y}px`)
        continue
      }
      letters.forEach((letter, i) => {
        const m = letterMotion(s, i, letters.length, t)
        letter.style.setProperty('--fill', `${m.fill}%`)
        letter.style.setProperty('--y', `${m.y}px`)
        letter.style.setProperty('--scale', String(m.scale))
        letter.style.setProperty('--glow', `${m.glow}px`)
        letter.style.setProperty('--glow-alpha', String(m.glowAlpha))
      })
    }
    const line = lyrics.lines[current]
    if (line?.kind === 'instrumental') {
      dots.forEach((dot, i) => (dot.style.opacity = String(dotOpacity(line, i, t))))
      const end = t > line.end - INSTRUMENTAL_ENDING
      if (end !== ending) ending = end
    } else if (ending) ending = false
  }

  onMount(() => {
    let frame = 0
    let lastTime = player.now()
    let lastFrame = performance.now()
    let opened = true

    const tick = (now: number): void => {
      frame = requestAnimationFrame(tick)
      const t = player.now()
      // where the playhead should be if nothing happened; further off = a seek (or a new song)
      const expected = lastTime + (player.playing ? (now - lastFrame) / 1000 : 0)
      const jumped = Math.abs(t - expected) > SEEK_JUMP
      lastTime = t
      lastFrame = now
      if (jumped && mode === 'user') {
        clearTimeout(userTimer)
        mode = 'auto'
      }
      const sung = activeLines(lyrics.lines, t)
      const changed = sung.join() !== active.join()
      if (changed || jumped || opened) {
        if (changed || opened) {
          active = sung
          collect(sung)
        }
        // opening the view: straight to the current line, no animation
        if (mode === 'auto') scrollToCurrent(!opened)
        opened = false
      }
      animate(t)
      if (scroll && scroller) {
        const elapsed = now - scroll.start
        scroller.scrollTop = scrollAt(scroll.from, targetTop(current), elapsed)
        if (scrollAt(0, 1, elapsed) >= 1) scroll = undefined
      }
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(userTimer)
    }
  })
</script>

<div
  class="lyrics"
  class:user={mode === 'user'}
  class:duet={lyrics.duet}
  bind:this={scroller}
  bind:clientHeight={height}
  onwheel={userScrolled}
  ontouchmove={userScrolled}
  onkeydown={onKey}
  role="presentation"
>
  <div class="start" aria-hidden="true"></div>
  {#each lines as { line, words: lineWords, background }, i (i)}
    {#if line.kind === 'instrumental'}
      <div class="instrumental" class:current={active.includes(i)} class:ending={active.includes(i) && ending} bind:this={lineEls[i]} aria-hidden="true">
        <div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
      </div>
    {:else}
      <button
        class="line"
        class:current={active.includes(i)}
        class:past={i < current && !active.includes(i)}
        class:sharp={active.includes(i) || (i === firstSung && current < firstSung)}
        class:secondary={line.secondary}
        class:timed={line.syllables.length > 0}
        bind:this={lineEls[i]}
        onclick={() => {
          backToAuto()
          void player.seek(line.begin)
        }}
      >
        {#if lineWords.length}
          {@render pieces(lineWords)}
        {:else}
          {line.text}
        {/if}
        {#if background.length}<span class="background">{@render pieces(background)}</span>{/if}
      </button>
    {/if}
  {/each}
  <div class="end" style:height="{Math.max(0, height - CURRENT_TOP)}px" aria-hidden="true"></div>
</div>

{#snippet pieces(ws: Piece[][])}
  {#each ws as word, w (w)}<span class="word"
      >{#each word as { s, letters }, k (k)}{#if letters}<span class="syl emph"
            >{#each letters as letter, l (l)}<span class="letter">{letter}</span>{/each}</span
          >{:else}<span class="syl">{s.text}</span>{/if}{/each}</span
    >{#if word[word.length - 1]?.s.space}{' '}{/if}{/each}
{/snippet}

<style>
  .lyrics {
    position: relative;
    height: 100%;
    padding: 0 var(--space-4);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
    outline: none;
    /* lines fade in at the top edge and out over the lower half */
    mask-image: linear-gradient(180deg, transparent, #000 var(--space-5), #000 50%, transparent);
    /* the white glows over the artwork colour */
    mix-blend-mode: plus-lighter;
  }
  .lyrics.user {
    mask-image: linear-gradient(180deg, transparent, #000 48px, #000 calc(100% - 48px), transparent);
  }
  .start {
    height: calc(48px - var(--space-lyric));
  }

  .line {
    display: block;
    width: 100%;
    margin-top: var(--space-lyric);
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: var(--text-lyric);
    font-weight: var(--weight-lyric);
    letter-spacing: var(--tracking-lyric);
    line-height: 1.206;
    text-align: left;
    overflow-wrap: break-word;
    color: var(--lyric-dim);
    cursor: pointer;
    transform-origin: left center;
    transition:
      color 0.1s,
      transform 0.1s ease-in-out,
      filter 0.25s linear,
      opacity 1s linear;
  }
  .duet .line.secondary {
    text-align: right;
    transform-origin: right center;
  }
  /* hover only while looking around: a resting pointer shouldn't light a line while following */
  .line.current,
  .lyrics.user .line:hover {
    color: var(--lyric);
  }
  /* following the song: everything but the current line is soft, sung lines fade away */
  .lyrics:not(.user) .line:not(.sharp) {
    filter: blur(2px);
  }
  .lyrics:not(.user) .line.past {
    opacity: 0;
  }

  .word {
    display: inline-block;
    white-space: nowrap;
  }
  .syl,
  .letter {
    display: inline-block;
    /* room above for the lift (the gradient is clipped to the glyphs) */
    margin-top: -5px;
    padding-top: 5px;
    white-space: pre;
  }
  /* the word fill: a soft edge sweeping through each syllable as it's sung */
  .current.timed .syl:not(.emph),
  .current.timed .letter {
    background-image: linear-gradient(
      to right,
      var(--lyric) var(--fill, -20%),
      var(--lyric-unsung) calc(var(--fill, -20%) + 20%)
    );
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    transform: translateY(var(--y, 0));
    /* own layer while active: the 2px lift glides in sub-pixel steps instead of snapping to whole pixels */
    will-change: transform;
  }
  .current.timed .letter {
    transform: translateY(var(--y, 0)) scale(var(--scale, 1));
    text-shadow: 0 0 var(--glow, 0) rgba(255, 255, 255, var(--glow-alpha, 0));
  }

  .background {
    display: none;
    margin-top: var(--space-0);
    font-size: var(--text-lyric-background);
  }
  .current .background {
    display: block;
  }

  /* instrumental gap: 3 dots, collapsed unless current */
  .instrumental {
    display: flex;
    align-items: center;
    height: 0;
    margin-top: 0;
    opacity: 0;
    transform: scale(0.1);
    transform-origin: left center;
    transition:
      height 0.3s ease-in-out,
      margin-top 0.3s ease-in-out,
      transform 0.3s ease-in-out,
      opacity 0.3s ease-in-out;
  }
  .instrumental.current {
    height: calc(var(--text-lyric) * 1.206);
    margin-top: var(--space-lyric);
    opacity: 1;
    transform: none;
  }
  .dots {
    display: flex;
    gap: var(--space-1);
    transform-origin: left center;
    animation: breathe 5s ease-in infinite;
  }
  .ending .dots {
    animation: swell 1s ease-in forwards;
  }
  .dot {
    width: var(--size-lyric-dot);
    height: var(--size-lyric-dot);
    border-radius: 50%;
    background: var(--lyric);
    opacity: 0.3;
  }
  @keyframes breathe {
    50% {
      transform: scale(1.2);
    }
  }
  @keyframes swell {
    from {
      transform: scale(1.1);
    }
    to {
      transform: scale(1.4);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dots,
    .ending .dots {
      animation: none;
    }
  }
</style>
