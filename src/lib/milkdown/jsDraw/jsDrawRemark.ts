import type { Node } from '@milkdown/transformer'

import { $remark } from '@milkdown/kit/utils'
import { visit } from 'unist-util-visit'

import { isJsDrawFigureHtml, svgMarkupFromFigureHtml } from '@/lib/drawing/jsDrawFigureMarkdown'

function replaceWithJsDrawNode(parent: Node & { children: Node[] }, index: number, html: string) {
  parent.children.splice(index, 1, {
    type: 'jsDraw',
    svgMarkup: svgMarkupFromFigureHtml(html),
  } as Node)
}

function transformJsDrawHtml(ast: Node) {
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
      if (!isJsDrawFigureHtml(value)) return

      replaceWithJsDrawNode(parent, index, value)
    },
  )

  visit(
    ast,
    'html',
    (node: Node & { value?: string }, index, parent: (Node & { children: Node[] }) | undefined) => {
      if (!parent || typeof index !== 'number') return

      const value = node.value ?? ''
      if (!isJsDrawFigureHtml(value)) return

      replaceWithJsDrawNode(parent, index, value)
    },
  )
}

export const jsDrawRemark = $remark('remark-js-draw', () => () => transformJsDrawHtml)
