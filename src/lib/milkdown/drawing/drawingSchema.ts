import { expectDomTypeError } from '@milkdown/exception'
import { $nodeSchema } from '@milkdown/kit/utils'

import {
  DRAWING_VIEWBOX,
  linesFromSvg,
  type DrawingLine,
} from '@/lib/drawing/drawingTypes'
import { figureHtmlFromLines } from '@/lib/drawing/figureMarkdown'

export const drawingSchema = $nodeSchema('drawing', () => ({
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  attrs: {
    lines: {
      default: [] as DrawingLine[],
    },
  },
  parseDOM: [
    {
      tag: 'figure[data-type="drawing"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) throw expectDomTypeError(dom)

        return {
          lines: linesFromSvg(dom.querySelector('svg')),
        }
      },
    },
  ],
  toDOM: (node) => {
    const lines = node.attrs.lines as DrawingLine[]
    const paths = lines.map((line) => [
      'path',
      {
        id: `id-${line.id}`,
        d: line.path,
        stroke: line.color,
        'stroke-width': line.size,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
    ])

    return [
      'figure',
      { 'data-type': 'drawing', class: 'sketch' },
      [
        'svg',
        {
          viewBox: DRAWING_VIEWBOX,
          xmlns: 'http://www.w3.org/2000/svg',
          'data-type': 'drawing',
        },
        ...paths,
      ],
    ]
  },
  parseMarkdown: {
    match: ({ type }) => type === 'drawing',
    runner: (state, node, type) => {
      state.addNode(type, { lines: (node as { lines?: DrawingLine[] }).lines ?? [] })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'drawing',
    runner: (state, node) => {
      state.addNode(
        'html',
        undefined,
        figureHtmlFromLines(node.attrs.lines as DrawingLine[]),
      )
    },
  },
}))
