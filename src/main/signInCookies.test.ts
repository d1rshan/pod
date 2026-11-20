import { describe, expect, test } from 'bun:test'
import { cookiesToAdopt } from './signInCookies'

const c = (name: string, value = 'v') => ({ name, value })

describe('cookiesToAdopt', () => {
  test('copies the session cookies when music.apple.com has no token', () => {
    const source = [c('media-user-token'), c('itre'), c('itspod'), c('itua'), c('pldfltcid'), c('pltvcid'), c('other')]
    const names = cookiesToAdopt(source, [c('itre')]).map((x) => x.name)
    expect(names).toEqual(['media-user-token', 'itspod', 'itua', 'pldfltcid', 'pltvcid'])
  })

  test('does nothing after a normal sign-in (token already visible)', () => {
    expect(cookiesToAdopt([c('media-user-token'), c('itua')], [c('media-user-token')])).toEqual([])
  })

  test('does nothing without a token to copy', () => {
    expect(cookiesToAdopt([c('itua'), c('media-user-token', '')], [])).toEqual([])
  })

  test('an empty target token counts as missing', () => {
    const names = cookiesToAdopt([c('media-user-token')], [c('media-user-token', '')]).map((x) => x.name)
    expect(names).toEqual(['media-user-token'])
  })
})
