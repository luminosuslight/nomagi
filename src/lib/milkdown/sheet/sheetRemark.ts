import type { Node } from '@milkdown/transformer'

import { $remark } from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'

import { isSheetComment, sheetFromMdastTable, sheetHasFormula } from '@/lib/sheet/sheetMarkdown'
import type { SheetCell } from '@/lib/sheet/sheetTypes'

type Parent = Node & { children: Node[] }

function isHtmlSheetComment(node: Node): boolean {
  return node.type === 'html' && isSheetComment(String((node as { value?: string }).value ?? ''))
}

/** Milkdown wraps a block HTML comment in a paragraph before our plugin runs. */
function isSheetMarker(node: Node | undefined): boolean {
  if (!node) return false
  if (isHtmlSheetComment(node)) return true
  if (node.type !== 'paragraph') return false
  const children = (node as Parent).children ?? []
  return children.length === 1 && isHtmlSheetComment(children[0])
}

export function transformSheetTables(ast: Node) {
  visit(ast, (node) => {
    const parent = node as Parent
    if (!Array.isArray(parent.children)) return

    const children = parent.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.type !== 'table') continue

      const cells = sheetFromMdastTable(child as { children?: unknown[] })
      const marked = isSheetMarker(children[i - 1])
      if (!marked && !sheetHasFormula(cells)) continue

      const sheetNode = { type: 'sheet', cells } as Node & { cells: SheetCell[][] }
      if (marked) {
        children.splice(i - 1, 2, sheetNode)
        i -= 1
      } else {
        children.splice(i, 1, sheetNode)
      }
    }
  })
}

export const sheetRemark = $remark('remark-sheet', () => () => transformSheetTables)
