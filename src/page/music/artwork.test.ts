import { describe, expect, test } from 'bun:test'
import { artworkUrl } from './artwork'

describe('artworkUrl', () => {
  test('fills the size placeholders', () => {
    expect(artworkUrl('https://a/{w}x{h}bb.jpg', 80)).toBe('https://a/80x80bb.jpg')
    expect(artworkUrl('https://a/{w}x{h}{c}.{f}', 79.6)).toBe('https://a/80x80bb.jpg')
  })

  test('fixed URLs (generated playlist covers) pass through', () => {
    const url = 'https://a/gen/1200x1200AM.PDCXS11.jpg?c1=9DB3F2'
    expect(artworkUrl(url, 80)).toBe(url)
  })
})
