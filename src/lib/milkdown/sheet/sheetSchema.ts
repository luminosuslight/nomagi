import { expectDomTypeError } from '@milkdown/exception'
import { $nodeSchema } from '@milkdown/kit/utils'

import { serializeSheetMarkdown } from '@/lib/sheet/sheetMarkdown'
import { emptySheet, type SheetCell } from '@/lib/sheet/sheetTypes'

function cellsFromDom(dom: HTMLElement): SheetCell[][] {
  const raw = dom.getAttribute('data-cells')
  if (!raw) return emptySheet()
  try {
    const parsed = JSON.parse(raw) as SheetCell[][]
    if (!Array.isArray(parsed) || parsed.length === 0) return emptySheet()
    return parsed
  } catch {
    return emptySheet()
  }
}

export const sheetSchema = $nodeSchema('sheet', () => ({
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  attrs: {
    cells: {
      default: emptySheet() as SheetCell[][],
    },
  },
  parseDOM: [
    {
      tag: 'div[data-type="sheet"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) throw expectDomTypeError(dom)
        return { cells: cellsFromDom(dom) }
      },
    },
  ],
  toDOM: (node) => {
    const cells = node.attrs.cells as SheetCell[][]
    return [
      'div',
      {
        'data-type': 'sheet',
        'data-cells': JSON.stringify(cells),
        class: 'sheet-block',
      },
    ]
  },
  parseMarkdown: {
    match: ({ type }) => type === 'sheet',
    runner: (state, node, type) => {
      state.addNode(type, {
        cells: (node as { cells?: SheetCell[][] }).cells ?? emptySheet(),
      })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'sheet',
    runner: (state, node) => {
      state.addNode('html', undefined, serializeSheetMarkdown(node.attrs.cells as SheetCell[][]))
    },
  },
}))
