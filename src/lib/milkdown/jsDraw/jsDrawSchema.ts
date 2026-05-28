import { expectDomTypeError } from '@milkdown/exception'
import { $nodeSchema } from '@milkdown/kit/utils'

import { figureHtmlFromSvgMarkup } from '@/lib/drawing/jsDrawFigureMarkdown'

function svgMarkupFromDom(dom: HTMLElement): string {
  const svg = dom.querySelector('svg')
  return svg?.outerHTML ?? ''
}

export const jsDrawSchema = $nodeSchema('jsDraw', () => ({
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  attrs: {
    svgMarkup: {
      default: '',
    },
  },
  parseDOM: [
    {
      tag: 'figure[data-type="js-draw"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) throw expectDomTypeError(dom)

        return {
          svgMarkup: svgMarkupFromDom(dom),
        }
      },
    },
  ],
  toDOM: (node) => {
    const figure = document.createElement('figure')
    figure.dataset.type = 'js-draw'
    figure.className = 'js-draw-sketch'

    const markup = node.attrs.svgMarkup as string
    if (markup) {
      const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
      const svg = doc.documentElement
      if (svg.tagName === 'svg') {
        figure.appendChild(document.importNode(svg, true))
      }
    }

    return figure
  },
  parseMarkdown: {
    match: ({ type }) => type === 'jsDraw',
    runner: (state, node, type) => {
      state.addNode(type, {
        svgMarkup: (node as { svgMarkup?: string }).svgMarkup ?? '',
      })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'jsDraw',
    runner: (state, node) => {
      state.addNode(
        'html',
        undefined,
        figureHtmlFromSvgMarkup(node.attrs.svgMarkup as string),
      )
    },
  },
}))
