import { current, initialNav, pop, push, selectTab, type Screen, type Tab } from './navStack'

/** Which tab is shown and each tab's screen stack. */
class Nav {
  #state = $state(initialNav())
  tab = $derived(this.#state.tab)
  screen = $derived(current(this.#state))

  open(screen: Screen): void {
    this.#state = push(this.#state, screen)
  }

  back(): void {
    this.#state = pop(this.#state)
  }

  select(tab: Tab): void {
    this.#state = selectTab(this.#state, tab)
  }

  reset(): void {
    this.#state = initialNav()
  }
}

export const nav = new Nav()
