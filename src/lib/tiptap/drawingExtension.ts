import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import DrawingNodeView from '@/components/tiptap/DrawingNodeView.vue'
import {
  DRAWING_VIEWBOX,
  linesFromSvg,
  type DrawingLine,
} from '@/lib/drawing/drawingTypes'
import { shouldStopDrawingEvent } from '@/lib/drawing/pointerEvents'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: {
      insertDrawing: () => ReturnType
    }
  }
}

export const Drawing = Node.create({
  name: 'drawing',
  group: 'block',
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      lines: {
        default: [] as DrawingLine[],
        parseHTML: (element) => {
          const svg = element.tagName === 'SVG' ? element : element.querySelector('svg')
          return linesFromSvg(svg)
        },
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="drawing"]',
        getAttrs: (element) => ({
          lines: linesFromSvg(element.querySelector('svg')),
        }),
      },
      {
        tag: 'svg[data-type="drawing"]',
        getAttrs: (element) => ({
          lines: linesFromSvg(element),
        }),
      },
    ]
  },

  renderHTML({ node }) {
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
      mergeAttributes({ 'data-type': 'drawing', class: 'sketch' }),
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

  addNodeView() {
    return VueNodeViewRenderer(DrawingNodeView, {
      stopEvent: ({ event }) => shouldStopDrawingEvent(event),
    })
  },

  addCommands() {
    return {
      insertDrawing:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    }
  },
})
