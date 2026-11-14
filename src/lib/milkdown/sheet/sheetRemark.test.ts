import { describe, expect, it } from 'vitest'

import { transformSheetTables } from '@/lib/milkdown/sheet/sheetRemark'
import type { SheetCell } from '@/lib/sheet/sheetTypes'

describe('transformSheetTables', () => {
  it('leaves a normal table alone', () => {
    const table = {
      type: 'table',
      children: [
        {
          type: 'tableRow',
          children: [{ type: 'tableCell', children: [{ type: 'text', value: 'A' }] }],
        },
        {
          type: 'tableRow',
          children: [{ type: 'tableCell', children: [{ type: 'text', value: '1' }] }],
        },
      ],
    }
    const ast = { type: 'root', children: [table] }
    transformSheetTables(ast)
    expect(ast.children[0]).toBe(table)
  })

  it('replaces a table marked with a sheet comment', () => {
    const ast = {
      type: 'root',
      children: [
        { type: 'html', value: '<!-- sheet -->' },
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [{ type: 'tableCell', children: [{ type: 'text', value: 'A' }] }],
            },
          ],
        },
      ],
    }
    transformSheetTables(ast)
    expect(ast.children).toHaveLength(1)
    expect(ast.children[0]).toMatchObject({ type: 'sheet' })
    const cells = (ast.children[0] as unknown as { cells: SheetCell[][] }).cells
    expect(cells[0][0]).toEqual({ formula: null, value: 'A' })
  })

  it('replaces a table whose sheet comment was wrapped in a paragraph', () => {
    const ast = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'html', value: '<!-- sheet -->' }],
        },
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [{ type: 'tableCell', children: [{ type: 'text', value: 'A' }] }],
            },
          ],
        },
      ],
    }
    transformSheetTables(ast)
    expect(ast.children).toHaveLength(1)
    expect(ast.children[0]).toMatchObject({ type: 'sheet' })
  })

  it('replaces an unmarked table that contains a formula link', () => {
    const ast = {
      type: 'root',
      children: [
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [{ type: 'tableCell', children: [{ type: 'text', value: 'Tax' }] }],
            },
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
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
        },
      ],
    }
    transformSheetTables(ast)
    expect(ast.children[0]).toMatchObject({ type: 'sheet' })
    const cells = (ast.children[0] as unknown as { cells: SheetCell[][] }).cells
    expect(cells[1][0]).toEqual({ formula: 'B2*0.2', value: '240' })
  })
})
