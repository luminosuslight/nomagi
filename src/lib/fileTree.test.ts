import { describe, expect, it } from 'vitest'
import { buildFileTree } from '@/lib/fileTree'

describe('buildFileTree', () => {
  it('groups nested files under folders', () => {
    const tree = buildFileTree(['note.md', 'quick_notes/a.md', 'quick_notes/b.md'])
    expect(tree).toEqual([
      {
        kind: 'folder',
        name: 'quick_notes',
        path: 'quick_notes',
        children: [
          { kind: 'file', name: 'a.md', path: 'quick_notes/a.md' },
          { kind: 'file', name: 'b.md', path: 'quick_notes/b.md' },
        ],
      },
      { kind: 'file', name: 'note.md', path: 'note.md' },
    ])
  })

  it('sorts folders before files and names alphabetically', () => {
    const tree = buildFileTree(['z.md', 'alpha/b.md', 'alpha/a.md'])
    expect(tree.map((n) => n.name)).toEqual(['alpha', 'z.md'])
    const alpha = tree[0]
    expect(alpha.kind).toBe('folder')
    if (alpha.kind === 'folder') {
      expect(alpha.children.map((n) => n.name)).toEqual(['a.md', 'b.md'])
    }
  })

  it('includes empty folders and sets nested folder paths', () => {
    const tree = buildFileTree(['note.md'], ['empty', 'docs/nested'])
    expect(tree).toEqual([
      {
        kind: 'folder',
        name: 'docs',
        path: 'docs',
        children: [{ kind: 'folder', name: 'nested', path: 'docs/nested', children: [] }],
      },
      { kind: 'folder', name: 'empty', path: 'empty', children: [] },
      { kind: 'file', name: 'note.md', path: 'note.md' },
    ])
  })
})
