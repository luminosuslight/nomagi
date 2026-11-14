import { describe, expect, it } from 'vitest'

import {
  formulaFromHref,
  parseSheetCell,
  parseSheetMarkdown,
  serializeSheetCell,
  serializeSheetMarkdown,
  sheetFromMdastTable,
  trimSheet,
} from '@/lib/sheet/sheetMarkdown'
import type { SheetCell } from '@/lib/sheet/sheetTypes'

describe('parseSheetCell', () => {
  it('reads an angle-bracket formula link', () => {
    expect(parseSheetCell('[240](<#B2*0.2>)')).toEqual({ formula: 'B2*0.2', value: '240' })
  })

  it('reads a MarkdownFormula destination without angle brackets', () => {
    expect(parseSheetCell('[11](#SUM(C1:C2))')).toEqual({ formula: 'SUM(C1:C2)', value: '11' })
  })

  it('treats a heading link as plain text', () => {
    expect(parseSheetCell('[docs](#intro)')).toEqual({ formula: null, value: '[docs](#intro)' })
  })

  it('unescapes pipes in values', () => {
    expect(parseSheetCell('a\\|b')).toEqual({ formula: null, value: 'a|b' })
  })
})

describe('formulaFromHref', () => {
  it('accepts encoded operators', () => {
    expect(formulaFromHref('#B2%2A0.2')).toBe('B2*0.2')
  })
})

describe('serializeSheetMarkdown', () => {
  it('writes the sheet comment and formula links', () => {
    const cells: SheetCell[][] = [
      [
        { formula: null, value: 'Item' },
        { formula: null, value: 'Amount' },
      ],
      [
        { formula: null, value: 'Rent' },
        { formula: null, value: '1200' },
      ],
      [
        { formula: null, value: 'Total' },
        { formula: 'SUM(B2:B2)', value: '1200' },
      ],
    ]

    expect(serializeSheetMarkdown(cells)).toBe(
      [
        '<!-- sheet -->',
        '| Item | Amount |',
        '| --- | --- |',
        '| Rent | 1200 |',
        '| Total | [1200](<#SUM(B2:B2)>) |',
      ].join('\n'),
    )
  })

  it('round-trips a formula table', () => {
    const markdown = [
      '<!-- sheet -->',
      '| Item | Amount | Tax |',
      '| --- | --- | --- |',
      '| Rent | 1200 | [240](<#B2*0.2>) |',
      '| Food | 400 | [80](<#B3*0.2>) |',
      '| Total | [1600](<#SUM(B2:B3)>) | [320](<#SUM(C2:C3)>) |',
    ].join('\n')

    expect(serializeSheetMarkdown(parseSheetMarkdown(markdown)!)).toBe(markdown)
  })
})

describe('trimSheet', () => {
  it('drops trailing empty rows and columns', () => {
    const cells: SheetCell[][] = [
      [
        { formula: null, value: 'A' },
        { formula: null, value: '' },
      ],
      [
        { formula: null, value: '1' },
        { formula: null, value: '' },
      ],
      [
        { formula: null, value: '' },
        { formula: null, value: '' },
      ],
    ]
    expect(trimSheet(cells)).toEqual([
      [{ formula: null, value: 'A' }],
      [{ formula: null, value: '1' }],
    ])
  })
})

describe('sheetFromMdastTable', () => {
  it('reads a parsed link cell', () => {
    const table = {
      children: [
        {
          children: [{ children: [{ type: 'text', value: 'Tax' }] }],
        },
        {
          children: [
            {
              children: [
                {
                  type: 'link',
                  url: '#B2*0.2',
                  children: [{ type: 'text', value: '240' }],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(sheetFromMdastTable(table)[1][0]).toEqual({ formula: 'B2*0.2', value: '240' })
  })
})

describe('serializeSheetCell', () => {
  it('escapes angle brackets in the formula', () => {
    expect(serializeSheetCell({ formula: 'A1<>B1', value: 'TRUE' })).toBe('[TRUE](<#A1\\<\\>B1>)')
  })
})
