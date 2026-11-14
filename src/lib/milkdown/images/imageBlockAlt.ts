import { imageBlockSchema } from '@milkdown/kit/component/image-block'

/** Crepe stores the resize ratio in the alt text, always formatted with two decimals. */
const RATIO_ALT = /^\d+\.\d{2}$/

export function parseImageBlockAlt(alt: string | null | undefined): {
  alt: string
  ratio: number
} {
  const value = alt ?? ''
  if (RATIO_ALT.test(value)) {
    const ratio = Number(value)
    if (ratio > 0) return { alt: '', ratio }
  }
  return { alt: value, ratio: 1 }
}

export function imageBlockAltText(alt: string, ratio: number): string {
  const fixed = Number(ratio).toFixed(2)
  return fixed === '1.00' || fixed === 'NaN' ? alt : fixed
}

/** Keeps real alt text on block images instead of overwriting it with the resize ratio. */
export const imageBlockWithAlt = imageBlockSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    attrs: { ...base.attrs, alt: { default: '', validate: 'string' } },
    parseDOM: base.parseDOM?.map((rule) => ({
      ...rule,
      getAttrs: (dom: HTMLElement) => {
        const attrs = rule.getAttrs?.(dom)
        if (!attrs || typeof attrs !== 'object') return attrs ?? null
        return { ...attrs, alt: dom.getAttribute('alt') ?? '' }
      },
    })),
    parseMarkdown: {
      match: base.parseMarkdown.match,
      runner: (state, node, type) => {
        const { alt, ratio } = parseImageBlockAlt(node.alt as string | undefined)
        state.addNode(type, {
          src: (node.url as string) ?? '',
          caption: (node.title as string | null) ?? '',
          ratio,
          alt,
        })
      },
    },
    toMarkdown: {
      match: base.toMarkdown.match,
      runner: (state, node) => {
        state.openNode('paragraph')
        state.addNode('image', undefined, undefined, {
          title: node.attrs.caption,
          url: node.attrs.src,
          alt: imageBlockAltText(node.attrs.alt, node.attrs.ratio),
        })
        state.closeNode()
      },
    },
  }
})
