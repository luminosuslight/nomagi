import { describe, expect, it } from 'vitest'

import { imageMimeType, isImageUrl, resolveRepoImagePath } from '@/lib/milkdown/images/imageUrls'

describe('isImageUrl', () => {
  it('accepts http(s) URLs ending in an image extension', () => {
    expect(isImageUrl('https://example.com/a.png')).toBe(true)
    expect(isImageUrl('http://example.com/dir/photo.JPG')).toBe(true)
    expect(isImageUrl('https://example.com/a.jpeg?w=800#top')).toBe(true)
    expect(isImageUrl('https://example.com/a.webp')).toBe(true)
  })

  it('rejects non-image URLs, other schemes and surrounding text', () => {
    expect(isImageUrl('https://example.com/page')).toBe(false)
    expect(isImageUrl('https://example.com/a.png.html')).toBe(false)
    expect(isImageUrl('https://example.com/?file=a.png')).toBe(false)
    expect(isImageUrl('ftp://example.com/a.png')).toBe(false)
    expect(isImageUrl('see https://example.com/a.png')).toBe(false)
    expect(isImageUrl('a.png')).toBe(false)
    expect(isImageUrl('')).toBe(false)
  })
})

describe('imageMimeType', () => {
  it('maps extensions case-insensitively', () => {
    expect(imageMimeType('img/a.SVG')).toBe('image/svg+xml')
    expect(imageMimeType('a.jpg')).toBe('image/jpeg')
    expect(imageMimeType('a.txt')).toBeNull()
  })
})

describe('resolveRepoImagePath', () => {
  it('resolves relative to the note folder', () => {
    expect(resolveRepoImagePath('notes/today.md', 'img/a.png')).toBe('notes/img/a.png')
    expect(resolveRepoImagePath('notes/today.md', './a.png')).toBe('notes/a.png')
    expect(resolveRepoImagePath('notes/today.md', '../assets/a.png')).toBe('assets/a.png')
    expect(resolveRepoImagePath('today.md', 'a.png')).toBe('a.png')
  })

  it('treats a leading slash as the repo root', () => {
    expect(resolveRepoImagePath('notes/today.md', '/assets/a.png')).toBe('assets/a.png')
  })

  it('decodes percent-encoding and drops query and hash', () => {
    expect(resolveRepoImagePath('n.md', 'my%20pic.png?v=2#x')).toBe('my pic.png')
  })

  it('ignores absolute URLs and paths outside the repo', () => {
    expect(resolveRepoImagePath('n.md', 'https://example.com/a.png')).toBeNull()
    expect(resolveRepoImagePath('n.md', 'data:image/png;base64,AAAA')).toBeNull()
    expect(resolveRepoImagePath('n.md', 'blob:http://localhost/123')).toBeNull()
    expect(resolveRepoImagePath('n.md', '//cdn.example.com/a.png')).toBeNull()
    expect(resolveRepoImagePath('n.md', '../a.png')).toBeNull()
    expect(resolveRepoImagePath('n.md', '')).toBeNull()
  })
})
