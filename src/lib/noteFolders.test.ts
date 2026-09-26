import { describe, expect, it } from 'vitest'
import {
  ancestorFolderPaths,
  assertSafeRelativePath,
  listFoldersFromFiles,
  noteParentFolder,
  resolveNewFolderPath,
} from '@/lib/noteFolders'

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

describe('noteParentFolder', () => {
  it('returns empty for root files', () => {
    expect(noteParentFolder('note.md')).toBe('')
  })

  it('returns the parent path for nested files', () => {
    expect(noteParentFolder('quick_notes/a.md')).toBe('quick_notes')
    expect(noteParentFolder('docs/proj/b.md')).toBe('docs/proj')
  })
})

describe('ancestorFolderPaths', () => {
  it('returns each ancestor from the root', () => {
    expect(ancestorFolderPaths('docs/proj/b.md')).toEqual(['docs', 'docs/proj'])
    expect(ancestorFolderPaths('note.md')).toEqual([])
  })
})

describe('resolveNewFolderPath', () => {
  it('keeps a slash in the name when the parent is the repo root', () => {
    expect(resolveNewFolderPath('folder/new_folder', '')).toBe('folder/new_folder')
  })

  it('joins the selected parent in front of the name', () => {
    expect(resolveNewFolderPath('new_folder', 'docs')).toBe('docs/new_folder')
    expect(resolveNewFolderPath('a/b', 'docs')).toBe('docs/a/b')
  })
})

describe('assertSafeRelativePath', () => {
  it('allows nested folders', () => {
    expect(assertSafeRelativePath('docs/proj')).toBe('docs/proj')
  })

  it('rejects unsafe segments', () => {
    expect(() => assertSafeRelativePath('../secret')).toThrow(/invalid segment/)
    expect(() => assertSafeRelativePath('docs/')).toThrow(/slash/)
    expect(() => assertSafeRelativePath('docs\\proj')).toThrow(/backslash/)
  })
})
