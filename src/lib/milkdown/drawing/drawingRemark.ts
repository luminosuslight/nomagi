import type { Node } from '@milkdown/transformer'

import { $remark } from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'

import { isDrawingFigureHtml, linesFromFigureHtml } from '@/lib/drawing/figureMarkdown'

function replaceWithDrawingNode(parent: Node & { children: Node[] }, index: number, html: string) {
  parent.children.splice(index, 1, {
    type: 'drawing',
    lines: linesFromFigureHtml(html),
  } as Node)
}

function transformDrawingHtml(ast: Node) {
  visit(
    ast,
    'paragraph',
    (
      node: Node & { children?: Node[] },
      index,
      parent: (Node & { children: Node[] }) | undefined,
    ) => {
      if (!parent || typeof index !== 'number' || !node.children) return
      if (node.children.length !== 1) return

      const child = node.children[0] as Node & { type?: string; value?: string }
      if (child.type !== 'html') return

      const value = child.value ?? ''
      if (!isDrawingFigureHtml(value)) return

      replaceWithDrawingNode(parent, index, value)
    },
  )

  visit(
    ast,
    'html',
    (node: Node & { value?: string }, index, parent: (Node & { children: Node[] }) | undefined) => {
      if (!parent || typeof index !== 'number') return

      const value = node.value ?? ''
      if (!isDrawingFigureHtml(value)) return

      replaceWithDrawingNode(parent, index, value)
    },
  )
}

export const drawingRemark = $remark('remark-drawing', () => () => transformDrawingHtml)
