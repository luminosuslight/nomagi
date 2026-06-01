import { describe, expect, it } from 'vitest'
import { Schema } from '@milkdown/prose/model'
import { TextSelection } from '@milkdown/prose/state'
import { EditorState } from '@milkdown/prose/state'

import {
  isFirstListItemInContainingList,
  isNestedListItem,
  shouldOutdentNestedListOnBackspace,
} from '@/lib/milkdown/listIndent/listIndentUtils'

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

function stateAtListDepth(nested: boolean, innerItemCount = 1) {
  const innerItems = Array.from({ length: innerItemCount }, (_, i) =>
    listItemType.create(
      null,
      schema.nodes.paragraph!.create(null, schema.text(i === 0 ? 'first' : 'second')),
    ),
  )
  const innerList = schema.nodes.bullet_list!.create(null, innerItems)
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

function $fromInNestedItemText(state: ReturnType<typeof stateAtListDepth>, itemIndex: number) {
  let found = 0
  let textPos = 0
  state.doc.descendants((node, pos) => {
    if (textPos > 0) return false
    if (!node.isText) return undefined
    if (found < itemIndex) {
      found++
      return undefined
    }
    textPos = pos
    return false
  })
  return state.doc.resolve(textPos)
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

describe('isFirstListItemInContainingList', () => {
  it('is true for the first item in a nested sub-list', () => {
    const state = stateAtListDepth(true, 2)
    const $from = $fromInNestedItemText(state, 0)
    const item = isNestedListItem($from, listItemType)
    expect(item).toBe(true)
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === listItemType) {
        expect(isFirstListItemInContainingList($from, d)).toBe(true)
        return
      }
    }
    throw new Error('expected list item')
  })

  it('is false when a previous sibling exists in the sub-list', () => {
    const state = stateAtListDepth(true, 2)
    const $from = $fromInNestedItemText(state, 1)
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === listItemType) {
        expect(isFirstListItemInContainingList($from, d)).toBe(false)
        return
      }
    }
    throw new Error('expected list item')
  })
})

describe('shouldOutdentNestedListOnBackspace', () => {
  it('is true at parentOffset 0 in a paragraph', () => {
    const state = stateAtListDepth(true)
    let textPos = 0
    state.doc.descendants((node, pos) => {
      if (textPos > 0) return false
      if (node.isText) {
        textPos = pos
        return false
      }
      return undefined
    })
    const $from = state.doc.resolve(textPos)
    expect($from.parent.isTextblock).toBe(true)
    expect(shouldOutdentNestedListOnBackspace($from)).toBe(true)
  })
})
