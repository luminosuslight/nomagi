import { bulletListSchema, orderedListSchema } from '@milkdown/kit/preset/commonmark'
import { extendListItemSchemaForTask } from '@milkdown/kit/preset/gfm'

/** remark.stringify skips the run phase — spread must be boolean in schema serializers. */
export const tightListItem = extendListItemSchemaForTask.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    attrs: { ...base.attrs, spread: { default: false, validate: 'boolean' } },
    parseMarkdown: {
      match: base.parseMarkdown.match,
      runner: (state, node, type) => {
        state.openNode(type, {
          label: node.label != null ? `${node.label}.` : '•',
          listType: node.label != null ? 'ordered' : 'bullet',
          spread: false,
          ...(node.checked != null ? { checked: Boolean(node.checked) } : {}),
        })
        state.next(node.children)
        state.closeNode()
      },
    },
    toMarkdown: {
      match: base.toMarkdown.match,
      runner: (state, node) => {
        state.openNode('listItem', undefined, {
          spread: false,
          ...(node.attrs.checked != null
            ? {
                label: node.attrs.label,
                listType: node.attrs.listType,
                checked: node.attrs.checked,
              }
            : {}),
        })
        state.next(node.content)
        state.closeNode()
      },
    },
  }
})

const tightListSpread = { default: false, validate: 'boolean' } as const

export const tightBulletList = bulletListSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    attrs: { ...base.attrs, spread: tightListSpread },
    parseMarkdown: {
      ...base.parseMarkdown,
      runner: (state, node, type) =>
        state.openNode(type, { spread: false }).next(node.children).closeNode(),
    },
    toMarkdown: {
      ...base.toMarkdown,
      runner: (state, node) =>
        state
          .openNode('list', undefined, { ordered: false, spread: false })
          .next(node.content)
          .closeNode(),
    },
  }
})

export const tightOrderedList = orderedListSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    attrs: { ...base.attrs, spread: tightListSpread },
    parseMarkdown: {
      ...base.parseMarkdown,
      runner: (state, node, type) =>
        state
          .openNode(type, { spread: false, order: node.start ?? 1 })
          .next(node.children)
          .closeNode(),
    },
    toMarkdown: {
      ...base.toMarkdown,
      runner: (state, node) =>
        state
          .openNode('list', undefined, {
            ordered: true,
            spread: false,
            start: node.attrs.order ?? 1,
          })
          .next(node.content)
          .closeNode(),
    },
  }
})
