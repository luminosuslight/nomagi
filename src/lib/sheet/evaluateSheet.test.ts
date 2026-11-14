import { describe, expect, it } from 'vitest'

import { bakeSheetResults, evaluateSheet } from '@/lib/sheet/evaluateSheet'
import type { SheetCell } from '@/lib/sheet/sheetTypes'

function grid(
  rows: Array<Array<Partial<SheetCell> & { value?: string; formula?: string | null }>>,
): SheetCell[][] {
  return rows.map((row) =>
    row.map((cell) => ({
      formula: cell.formula ?? null,
      value: cell.value ?? '',
    })),
  )
}

describe('evaluateSheet', () => {
  it('evaluates arithmetic and SUM of a column', () => {
    const cells = grid([
      [{ value: 'Item' }, { value: 'Amount' }, { value: 'Tax' }],
      [{ value: 'Rent' }, { value: '1200' }, { formula: 'B2*0.2' }],
      [{ value: 'Food' }, { value: '400' }, { formula: 'B3*0.2' }],
      [{ value: 'Total' }, { formula: 'SUM(B2:B3)' }, { formula: 'SUM(C2:C3)' }],
    ])

    expect(evaluateSheet(cells)).toEqual([
      ['Item', 'Amount', 'Tax'],
      ['Rent', '1200', '240'],
      ['Food', '400', '80'],
      ['Total', '1600', '320'],
    ])
  })

  it('evaluates SUM of a row', () => {
    const cells = grid([
      [{ value: 'A' }, { value: 'B' }, { value: 'C' }],
      [{ value: '1' }, { value: '2' }, { formula: 'SUM(A2:B2)' }],
    ])
    expect(evaluateSheet(cells)[1][2]).toBe('3')
  })

  it('returns #DIV/0! for divide by zero', () => {
    const cells = grid([[{ value: 'n' }], [{ formula: '1/0' }]])
    expect(evaluateSheet(cells)[1][0]).toBe('#DIV/0!')
  })

  it('returns #CYCLE! for a loop', () => {
    const cells = grid([
      [{ value: 'A' }, { value: 'B' }],
      [{ formula: 'B2' }, { formula: 'A2' }],
    ])
    expect(evaluateSheet(cells)[1][0]).toBe('#CYCLE!')
    expect(evaluateSheet(cells)[1][1]).toBe('#CYCLE!')
  })

  it('bakes formula results into cells', () => {
    const cells = grid([[{ value: 'n' }], [{ value: '4' }], [{ formula: 'A2*2', value: 'stale' }]])
    expect(bakeSheetResults(cells)[2][0]).toEqual({ formula: 'A2*2', value: '8' })
  })
})
