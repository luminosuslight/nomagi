import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateIsoDateFilename,
  QUICK_NOTES_DIR,
  resolveMoveNotePath,
  resolveNewNoteFilename,
  resolveRenameNotePath,
} from '@/lib/noteFilenames'

describe('resolveNewNoteFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('places untitled quick notes in quick_notes when no folder is selected', () => {
    expect(resolveNewNoteFilename(undefined, [])).toBe(
      `${QUICK_NOTES_DIR}/${generateIsoDateFilename()}`,
    )
  })

  it('places named notes at repo root when no folder is selected', () => {
    expect(resolveNewNoteFilename({ name: 'my-note' }, [])).toBe('my-note.md')
  })

  it('places untitled notes in the selected folder', () => {
    expect(resolveNewNoteFilename({ folder: QUICK_NOTES_DIR }, [])).toBe(
      `${QUICK_NOTES_DIR}/${generateIsoDateFilename()}`,
    )
  })

  it('avoids basename collisions within the target folder only', () => {
    const base = generateIsoDateFilename()
    expect(resolveNewNoteFilename(undefined, [`${QUICK_NOTES_DIR}/${base}`])).toBe(
      `${QUICK_NOTES_DIR}/${base.replace(/\.md$/, '-2.md')}`,
    )
    expect(
      resolveNewNoteFilename({ folder: QUICK_NOTES_DIR }, [`${QUICK_NOTES_DIR}/${base}`]),
    ).toBe(`${QUICK_NOTES_DIR}/${base.replace(/\.md$/, '-2.md')}`)
    expect(resolveNewNoteFilename({ folder: QUICK_NOTES_DIR }, [base])).toBe(
      `${QUICK_NOTES_DIR}/${base}`,
    )
  })

  it('keeps user-named notes in the selected folder', () => {
    expect(resolveNewNoteFilename({ name: 'my-note', folder: QUICK_NOTES_DIR }, [])).toBe(
      `${QUICK_NOTES_DIR}/my-note.md`,
    )
  })

  it('creates missing folders from slashes in the name', () => {
    expect(resolveNewNoteFilename({ name: 'new_folder/my_note' }, [])).toBe('new_folder/my_note.md')
    expect(resolveNewNoteFilename({ name: 'new_folder/my_note', folder: 'docs' }, [])).toBe(
      'docs/new_folder/my_note.md',
    )
  })

  it('allows a nested selected folder', () => {
    expect(resolveNewNoteFilename({ name: 'my-note', folder: 'docs/proj' }, [])).toBe(
      'docs/proj/my-note.md',
    )
    expect(resolveNewNoteFilename({ folder: 'docs/proj' }, [])).toBe(
      `docs/proj/${generateIsoDateFilename()}`,
    )
  })

  it('uses the .canvas extension for whiteboards', () => {
    expect(resolveNewNoteFilename({ name: 'plan', kind: 'canvas' }, [])).toBe('plan.canvas')
    expect(resolveNewNoteFilename({ name: 'plan.canvas', kind: 'canvas' }, [])).toBe('plan.canvas')
    const iso = generateIsoDateFilename(new Date(), '.canvas')
    expect(iso).toMatch(/\.canvas$/)
    expect(resolveNewNoteFilename({ kind: 'canvas' }, [`${QUICK_NOTES_DIR}/${iso}`])).toBe(
      `${QUICK_NOTES_DIR}/${iso.replace(/\.canvas$/, '-2.canvas')}`,
    )
  })

  it('rejects unsafe names', () => {
    expect(() => resolveNewNoteFilename({ name: '../secret' }, [])).toThrow(/invalid segment/)
    expect(() => resolveNewNoteFilename({ name: 'new_folder/' }, [])).toThrow(/slash/)
  })
})

describe('resolveMoveNotePath', () => {
  it('moves a named root note into a folder', () => {
    expect(resolveMoveNotePath('my-note.md', QUICK_NOTES_DIR, ['my-note.md'])).toBe(
      `${QUICK_NOTES_DIR}/my-note.md`,
    )
  })

  it('moves a folder note to the repo root', () => {
    expect(
      resolveMoveNotePath(`${QUICK_NOTES_DIR}/my-note.md`, '', [`${QUICK_NOTES_DIR}/my-note.md`]),
    ).toBe('my-note.md')
  })

  it('moves iso quick notes to the repo root', () => {
    const iso = `${QUICK_NOTES_DIR}/${generateIsoDateFilename()}`
    expect(resolveMoveNotePath(iso, '', [iso])).toBe(generateIsoDateFilename())
  })

  it('renames on basename collision in the target folder', () => {
    expect(
      resolveMoveNotePath('docs/a.md', QUICK_NOTES_DIR, ['docs/a.md', `${QUICK_NOTES_DIR}/a.md`]),
    ).toBe(`${QUICK_NOTES_DIR}/a-2.md`)
  })

  it('moves into a nested folder', () => {
    expect(resolveMoveNotePath('a.md', 'docs/proj', ['a.md'])).toBe('docs/proj/a.md')
  })
})

describe('resolveRenameNotePath', () => {
  it('keeps the parent folder and markdown extension', () => {
    expect(resolveRenameNotePath('docs/proj/a.md', 'renamed', ['docs/proj/a.md'])).toBe(
      'docs/proj/renamed.md',
    )
  })

  it('preserves a pdf extension', () => {
    expect(resolveRenameNotePath('docs/scan.pdf', 'renamed', ['docs/scan.pdf'])).toBe(
      'docs/renamed.pdf',
    )
    expect(resolveRenameNotePath('docs/scan.pdf', 'renamed.pdf', ['docs/scan.pdf'])).toBe(
      'docs/renamed.pdf',
    )
  })

  it('preserves a canvas extension', () => {
    expect(resolveRenameNotePath('boards/a.canvas', 'b', ['boards/a.canvas'])).toBe(
      'boards/b.canvas',
    )
    expect(resolveMoveNotePath('a.canvas', 'boards', ['a.canvas', 'boards/a.canvas'])).toBe(
      'boards/a-2.canvas',
    )
  })

  it('returns the same path when the stem is unchanged', () => {
    expect(resolveRenameNotePath('docs/a.md', 'a', ['docs/a.md'])).toBe('docs/a.md')
  })

  it('rejects collisions and path separators', () => {
    expect(() => resolveRenameNotePath('docs/a.md', 'b', ['docs/a.md', 'docs/b.md'])).toThrow(
      /already exists/,
    )
    expect(() => resolveRenameNotePath('docs/a.md', 'sub/b', ['docs/a.md'])).toThrow(
      /path separators/,
    )
  })
})
