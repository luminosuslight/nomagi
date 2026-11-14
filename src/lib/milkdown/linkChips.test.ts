import { describe, expect, it } from 'vitest'
import { linkChipDomain } from '@/lib/milkdown/linkChips'

describe('linkChipDomain', () => {
  it('returns the domain for bare URLs', () => {
    expect(
      linkChipDomain('https://www.youtube.com/watch?v=1', 'https://www.youtube.com/watch?v=1'),
    ).toBe('youtube.com')
    expect(linkChipDomain('sartor-stoffe.de/beitrag', 'https://sartor-stoffe.de/beitrag')).toBe(
      'sartor-stoffe.de',
    )
  })

  it('keeps links with custom text', () => {
    expect(linkChipDomain('V-Neck Tutorial', 'https://example.com/v-neck')).toBeNull()
  })

  it('ignores relative links', () => {
    expect(linkChipDomain('notes/other.md', 'notes/other.md')).toBeNull()
  })
})
