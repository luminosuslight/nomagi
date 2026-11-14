import { describe, expect, it } from 'vitest'
import {
  applyFormulaReference,
  formulaReferenceRanges,
  rangeReference,
  sheetCellsFromEditorValues,
  sheetCellsToEditorValues,
} from '@/lib/sheet/sheetGrid'
import type { SheetCell } from '@/lib/sheet/sheetTypes'

describe('sheet grid values', () => {
  it('keeps formulas with a leading equals for the grid and strips it on the way back', () => {
    const cells: SheetCell[][] = [
      [
        { formula: null, value: 'Foo' },
        { formula: 'B2*C2', value: '20' },
      ],
    ]
    expect(sheetCellsToEditorValues(cells)).toEqual([['Foo', '=B2*C2']])
    expect(sheetCellsFromEditorValues([['Foo', '=B2*C2']])).toEqual([
      [
        { formula: null, value: 'Foo' },
        { formula: 'B2*C2', value: '' },
      ],
    ])
  })

  it('inserts a clicked cell and replaces the reference just typed', () => {
    expect(applyFormulaReference('=', 1, 1, 'C2')).toEqual({ value: '=C2', cursor: 3 })
    expect(applyFormulaReference('=C2', 3, 3, 'D2')).toEqual({ value: '=D2', cursor: 3 })
    expect(applyFormulaReference('=D2+', 4, 4, 'B3')).toEqual({ value: '=D2+B3', cursor: 6 })
  })

  it('turns a drag into one range and keeps extending that range', () => {
    const first = applyFormulaReference(
      '=SUM(',
      5,
      5,
      rangeReference({ x: 1, y: 1 }, { x: 1, y: 1 }),
    )
    expect(first).toEqual({ value: '=SUM(B2', cursor: 7 })
    expect(applyFormulaReference(first!.value, first!.cursor, first!.cursor, 'B2:B4')).toEqual({
      value: '=SUM(B2:B4',
      cursor: 10,
    })
    expect(rangeReference({ x: 3, y: 4 }, { x: 1, y: 1 })).toBe('B2:D5')
  })

  it('finds every cell and range a formula uses', () => {
    expect(formulaReferenceRanges('=B2+C3')).toEqual([
      { x1: 1, y1: 1, x2: 1, y2: 1 },
      { x1: 2, y1: 2, x2: 2, y2: 2 },
    ])
    expect(formulaReferenceRanges('=SUM($B$2:D4)')).toEqual([{ x1: 1, y1: 1, x2: 3, y2: 3 }])
    expect(formulaReferenceRanges('="B2"+A1')).toEqual([{ x1: 0, y1: 0, x2: 0, y2: 0 }])
    expect(formulaReferenceRanges('=LOG10(A1)')).toEqual([{ x1: 0, y1: 0, x2: 0, y2: 0 }])
  })

  it('leaves a reference alone when the caret is inside a string', () => {
    expect(applyFormulaReference('="A1"', 4, 4, 'B2')).toBeNull()
  })

  it('treats a bare equals sign as an empty cell', () => {
    expect(sheetCellsFromEditorValues([['=', null, 12]])).toEqual([
      [
        { formula: null, value: '' },
        { formula: null, value: '' },
        { formula: null, value: '12' },
      ],
    ])
  })
})
