import { describe, expect, test } from 'bun:test'
import { current, initialNav, pop, push, selectTab, type Screen } from './navStack'

const chill: Screen = { name: 'playlist', playlist: { id: 'p.1', name: 'Chill' } }

describe('navStack', () => {
  test('starts on the library root', () => {
    expect(current(initialNav())).toEqual({ name: 'library' })
  })

  test('push and pop within a tab, never past the root', () => {
    const opened = push(initialNav(), chill)
    expect(current(opened)).toEqual(chill)
    const back = pop(opened)
    expect(current(back)).toEqual({ name: 'library' })
    expect(pop(back)).toBe(back)
  })

  test('each tab keeps its own stack', () => {
    const opened = push(initialNav(), chill)
    const onDiscover = selectTab(opened, 'discover')
    expect(current(onDiscover)).toEqual({ name: 'discover' })
    expect(current(selectTab(onDiscover, 'library'))).toEqual(chill)
  })

  test('re-selecting the current tab goes back to its root', () => {
    const opened = push(initialNav(), chill)
    expect(current(selectTab(opened, 'library'))).toEqual({ name: 'library' })
  })

  test('does not mutate the previous state', () => {
    const start = initialNav()
    push(start, chill)
    expect(start.stacks.library).toEqual([{ name: 'library' }])
  })
})
