import TurndownService from 'turndown'
import { svgMarkupFromLines, type DrawingLine } from '@/lib/tiptap/drawingTypes'

function drawingMarkdownFromNode(node: HTMLElement): string {
  const svg = node.querySelector('svg')
  if (svg) {
    return `\n\n<figure data-type="drawing" class="sketch">\n${svg.outerHTML}\n</figure>\n\n`
  }

  const lines = JSON.parse(node.getAttribute('data-lines') ?? '[]') as DrawingLine[]
  return `\n\n<figure data-type="drawing" class="sketch">\n${svgMarkupFromLines(lines)}\n</figure>\n\n`
}

export function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    blankReplacement: (_content, node) => {
      const element = node as HTMLElement & { isBlock?: boolean }
      if (element.nodeName === 'FIGURE' && element.getAttribute('data-type') === 'drawing') {
        return drawingMarkdownFromNode(element)
      }

      return element.isBlock ? '\n\n' : ''
    },
  })

  turndown.escape = (string: string) => string

  // SVG-only figures are treated as blank, so the rule above is the main path.
  // This covers any non-blank drawing figure edge cases.
  turndown.addRule('drawing', {
    filter: (node) =>
      node.nodeName === 'FIGURE' &&
      (node as HTMLElement).getAttribute('data-type') === 'drawing',
    replacement: (_content, node) => drawingMarkdownFromNode(node as HTMLElement),
  })

  return turndown
}
