import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateIsoDateFilename,
  QUICK_NOTES_DIR,
  resolveNewNoteFilename,
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
})
