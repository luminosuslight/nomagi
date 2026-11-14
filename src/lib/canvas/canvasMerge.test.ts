import { describe, expect, it } from 'vitest'
import { mergeCanvasText } from './canvasMerge'
import { parseCanvas, serializeCanvas, type CanvasNode } from './jsonCanvas'
import { notesMergeDriver } from '@/lib/notesMergeDriver'

function text(id: string, value: string, x = 0, y = 0): CanvasNode {
  return { id, type: 'text', text: value, x, y, width: 100, height: 100 }
}

function canvas(nodes: CanvasNode[], edges: unknown[] = []): string {
  return serializeCanvas({ nodes, edges: edges as never })
}

function mergedNodes(base: string, ours: string, theirs: string) {
  return parseCanvas(mergeCanvasText(base, ours, theirs)).nodes
}

describe('mergeCanvasText', () => {
  it('keeps nodes added on both sides', () => {
    const base = canvas([text('a', 'A')])
    const ours = canvas([text('a', 'A'), text('b', 'B')])
    const theirs = canvas([text('a', 'A'), text('c', 'C')])
    expect(mergedNodes(base, ours, theirs).map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('merges different fields changed on each side', () => {
    const base = canvas([text('a', 'A')])
    const ours = canvas([text('a', 'A', 50, 0)])
    const theirs = canvas([{ ...text('a', 'A'), color: '3' }])
    expect(mergedNodes(base, ours, theirs)).toEqual([{ ...text('a', 'A', 50, 0), color: '3' }])
  })

  it('combines conflicting text edits instead of dropping one', () => {
    const base = canvas([text('a', 'line')])
    const ours = canvas([text('a', 'local')])
    const theirs = canvas([text('a', 'remote')])
    expect(mergedNodes(base, ours, theirs)[0]).toMatchObject({ text: 'local\nremote' })
  })

  it('prefers ours for conflicting geometry', () => {
    const base = canvas([text('a', 'A', 0, 0)])
    const ours = canvas([text('a', 'A', 10, 0)])
    const theirs = canvas([text('a', 'A', 20, 0)])
    expect(mergedNodes(base, ours, theirs)[0]).toMatchObject({ x: 10 })
  })

  it('deletes untouched nodes but keeps nodes edited on the other side', () => {
    const base = canvas([text('a', 'A'), text('b', 'B')])
    const ours = canvas([text('b', 'B edited')])
    const theirs = canvas([text('a', 'A')])
    expect(mergedNodes(base, ours, theirs)).toEqual([text('b', 'B edited')])
  })

  it('drops edges whose nodes were removed', () => {
    const edge = { id: 'e', fromNode: 'a', toNode: 'b' }
    const base = canvas([text('a', 'A'), text('b', 'B')], [edge])
    const ours = canvas([text('a', 'A'), text('b', 'B'), text('c', 'C')], [edge])
    const theirs = canvas([text('a', 'A')], [])
    const merged = parseCanvas(mergeCanvasText(base, ours, theirs))
    expect(merged.nodes.map((n) => n.id)).toEqual(['a', 'c'])
    expect(merged.edges).toEqual([])
  })

  it('falls back to the side that still parses', () => {
    const base = canvas([text('a', 'A')])
    const good = canvas([text('a', 'A'), text('b', 'B')])
    expect(mergeCanvasText(base, '{broken', good)).toBe(good)
    expect(mergeCanvasText(base, good, '{broken')).toBe(good)
  })

  it('keeps the other side verbatim when one side is unchanged', () => {
    const base = canvas([text('a', 'A')])
    const theirs =
      '{"nodes":[{"id":"a","type":"text","text":"A2","x":0,"y":0,"width":1,"height":1}]}'
    expect(mergeCanvasText(base, base, theirs)).toBe(theirs)
  })

  it('is used by the notes merge driver for .canvas files', () => {
    const base = canvas([text('a', 'A')])
    const ours = canvas([text('a', 'A'), text('b', 'B')])
    const theirs = canvas([text('a', 'A'), text('c', 'C')])
    const result = notesMergeDriver({
      branches: ['main', 'main', 'main'],
      contents: [base, ours, theirs],
      path: 'boards/plan.canvas',
    } as never) as { mergedText: string }
    expect(parseCanvas(result.mergedText).nodes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })
})
