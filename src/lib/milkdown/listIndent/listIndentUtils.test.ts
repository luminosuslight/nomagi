import { describe, expect, it } from 'vitest'
import { Schema } from '@milkdown/prose/model'
import { TextSelection } from '@milkdown/prose/state'
import { EditorState } from '@milkdown/prose/state'

import { isNestedListItem } from '@/lib/milkdown/listIndent/listIndentUtils'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    bullet_list: { content: 'list_item+' },
    list_item: {
      content: 'paragraph block*',
      toDOM: () => ['li', 0] as const,
      parseDOM: [{ tag: 'li' }],
    },
    text: { group: 'inline' },
  },
})

const listItemType = schema.nodes.list_item!

function stateAtListDepth(nested: boolean) {
  const item = listItemType.create(null, schema.nodes.paragraph!.create(null, schema.text('x')))
  const innerList = schema.nodes.bullet_list!.create(null, [item])
  const outerItem = listItemType.create(
    null,
    nested
      ? [schema.nodes.paragraph!.create(), innerList]
      : [schema.nodes.paragraph!.create(null, schema.text('x'))],
  )
  const doc = schema.nodes.doc!.create(null, [schema.nodes.bullet_list!.create(null, [outerItem])])
  const pos = nested ? 4 : 3
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, pos),
  })
}

describe('isNestedListItem', () => {
  it('is false for a top-level list item', () => {
    const state = stateAtListDepth(false)
    expect(isNestedListItem(state.selection.$from, listItemType)).toBe(false)
  })

  it('is true for a nested list item', () => {
    const state = stateAtListDepth(true)
    const $from = state.doc.resolve(6)
    expect(isNestedListItem($from, listItemType)).toBe(true)
  })
})
