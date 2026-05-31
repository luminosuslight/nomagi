import { describe, expect, it } from 'vitest'
import { notesMergeDriver } from './notesMergeDriver'

function merge(base: string, ours: string, theirs: string): string {
  const result = notesMergeDriver({
    branches: ['main', 'main', 'main'],
    contents: [base, ours, theirs],
    path: 'note.md',
  })
  expect(result).toMatchObject({ cleanMerge: true })
  return (result as { cleanMerge: true; mergedText: string }).mergedText
}

describe('notesMergeDriver', () => {
  it('returns ours when ours and theirs are identical', () => {
    const text = '# Title\n\nBody line.\n'
    expect(merge('base ignored', text, text)).toBe(text)
  })

  it('merges non-overlapping line edits inside the same conflict hunk', () => {
    const base = 'alpha\nbeta\ngamma\n'
    const ours = 'alpha\nBETA\ngamma\n'
    const theirs = 'alpha\nbeta\nGAMMA\n'

    expect(merge(base, ours, theirs)).toBe('alpha\nBETA\nGAMMA\n')
  })

  it('keeps both sides when the same region was edited differently', () => {
    const base = 'title\nbody\n'
    const ours = 'title\nLOCAL\n'
    const theirs = 'title\nREMOTE\n'

    expect(merge(base, ours, theirs)).toBe('title\nLOCAL\nREMOTE\n')
  })

  it('uses remote content when ours is empty', () => {
    const base = 'unchanged\n'
    const theirs = 'unchanged\nremote addition\n'

    expect(merge(base, '', theirs)).toBe(theirs)
  })

  it('uses local content when theirs is empty', () => {
    const base = 'unchanged\n'
    const ours = 'unchanged\nlocal addition\n'

    expect(merge(base, ours, '')).toBe(ours)
  })

  it('concatenates single-line documents on conflict', () => {
    const ours = 'only local'
    const theirs = 'only remote'

    expect(merge('', ours, theirs)).toBe('only local\nonly remote')
  })

  it('appends remote after local when both sides edited the same trailing line', () => {
    const base = 'intro\nshared\n'
    const ours = 'intro\nours version\n'
    const theirs = 'intro\ntheirs version\n'

    expect(merge(base, ours, theirs)).toBe('intro\nours version\ntheirs version\n')
  })
})
