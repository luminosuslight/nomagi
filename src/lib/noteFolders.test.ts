import { describe, expect, it } from 'vitest'
import { listFoldersFromFiles } from '@/lib/noteFolders'

describe('listFoldersFromFiles', () => {
  it('returns unique sorted folder paths', () => {
    expect(
      listFoldersFromFiles(['note.md', 'quick_notes/a.md', 'docs/proj/b.md', 'docs/a.md']),
    ).toEqual(['docs', 'docs/proj', 'quick_notes'])
  })

  it('returns empty when all files are at root', () => {
    expect(listFoldersFromFiles(['a.md', 'b.md'])).toEqual([])
  })
})
