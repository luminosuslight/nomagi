import { describe, expect, it } from 'vitest'

import { pastedImageExtension, pastedImagePath, withNumericSuffix } from '@/lib/pastedImages'

describe('pastedImagePath', () => {
  const now = new Date(2026, 10, 14, 12, 10, 33)

  it('names the file after the paste time with an extension from the MIME type', () => {
    expect(pastedImagePath('image/png', now)).toBe('pasted_images/2026-11-14T12-10-33.png')
    expect(pastedImagePath('image/jpeg', now)).toBe('pasted_images/2026-11-14T12-10-33.jpg')
    expect(pastedImagePath('image/webp', now)).toBe('pasted_images/2026-11-14T12-10-33.webp')
  })

  it('rejects types that are not stored', () => {
    expect(() => pastedImagePath('image/bmp', now)).toThrow('Unsupported image type')
    expect(pastedImageExtension('')).toBeNull()
  })
})

describe('withNumericSuffix', () => {
  it('inserts the suffix before the extension', () => {
    expect(withNumericSuffix('pasted_images/a.png', 2)).toBe('pasted_images/a-2.png')
    expect(withNumericSuffix('dir.v1/name', 3)).toBe('dir.v1/name-3')
  })
})
