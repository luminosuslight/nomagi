import { Schema, type Node } from '@milkdown/prose/model'
import { EditorState, TextSelection } from '@milkdown/prose/state'
import { describe, expect, it } from 'vitest'

import { insertImageTransaction } from '@/lib/milkdown/images/pasteImageUrl'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    code_block: { group: 'block', content: 'text*', code: true },
    list_item: { content: 'paragraph block*' },
    bullet_list: { group: 'block', content: 'list_item+' },
    'image-block': { group: 'block', atom: true, attrs: { src: { default: '' } } },
    image: { group: 'inline', inline: true, attrs: { src: { default: '' } } },
    text: { group: 'inline' },
  },
})

const URL = 'https://example.com/a.png'

function stateAt(doc: Node, pos: number) {
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) })
}

describe('insertImageTransaction', () => {
  it('replaces an empty top-level paragraph with a block image', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('before')]),
      schema.node('paragraph'),
    ])
    const tr = insertImageTransaction(stateAt(doc, 9), URL)!
    expect(tr.doc.child(1).type.name).toBe('image-block')
    expect(tr.doc.child(1).attrs.src).toBe(URL)
    expect(tr.doc.childCount).toBe(2)
  })

  it('inserts an inline image inside text', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('ab')])])
    const tr = insertImageTransaction(stateAt(doc, 2), URL)!
    const paragraph = tr.doc.child(0)
    expect(paragraph.childCount).toBe(3)
    expect(paragraph.child(1).type.name).toBe('image')
    expect(paragraph.child(1).attrs.src).toBe(URL)
  })

  it('falls back to an inline image where a block is not allowed', () => {
    const doc = schema.node('doc', null, [
      schema.node('bullet_list', null, [
        schema.node('list_item', null, [schema.node('paragraph')]),
      ]),
    ])
    const tr = insertImageTransaction(stateAt(doc, 3), URL)!
    const paragraph = tr.doc.child(0).child(0).child(0)
    expect(paragraph.type.name).toBe('paragraph')
    expect(paragraph.child(0).type.name).toBe('image')
  })

  it('does nothing inside a code block', () => {
    const doc = schema.node('doc', null, [schema.node('code_block', null, [schema.text('x')])])
    expect(insertImageTransaction(stateAt(doc, 1), URL)).toBeNull()
  })
})
