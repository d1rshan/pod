// Pure tab + per-tab stack logic behind state/nav.svelte.ts (spec: tabs, each with a small stack; no router).
import type { Playlist } from '../music/types'

export type Tab = 'playing' | 'library' | 'discover'

export const TABS: readonly Tab[] = ['playing', 'library', 'discover']

export type Screen =
  | { name: 'playing' }
  | { name: 'lyrics' }
  | { name: 'library' }
  | { name: 'playlist'; playlist: Playlist }
  | { name: 'discover' }

export interface NavState {
  tab: Tab
  stacks: Record<Tab, Screen[]>
}

const root = (tab: Tab): Screen => ({ name: tab })

export function initialNav(tab: Tab = 'library'): NavState {
  return { tab, stacks: { playing: [root('playing')], library: [root('library')], discover: [root('discover')] } }
}

export function current(nav: NavState): Screen {
  const stack = nav.stacks[nav.tab]
  return stack[stack.length - 1] ?? root(nav.tab)
}

/** Opens `screen` on top of the current tab's stack. */
export function push(nav: NavState, screen: Screen): NavState {
  return { ...nav, stacks: { ...nav.stacks, [nav.tab]: [...nav.stacks[nav.tab], screen] } }
}

/** Goes back one screen in the current tab (never past its root). */
export function pop(nav: NavState): NavState {
  const stack = nav.stacks[nav.tab]
  if (stack.length <= 1) return nav
  return { ...nav, stacks: { ...nav.stacks, [nav.tab]: stack.slice(0, -1) } }
}

/** Switches tab, keeping each tab's stack; re-selecting the current tab goes back to its root. */
export function selectTab(nav: NavState, tab: Tab): NavState {
  if (tab !== nav.tab) return { ...nav, tab }
  return { ...nav, stacks: { ...nav.stacks, [tab]: [root(tab)] } }
}
