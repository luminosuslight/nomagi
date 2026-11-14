import { describe, expect, it } from 'vitest'
import {
  canvasPlainText,
  canvasPreviewFromContent,
  emptyCanvas,
  parseCanvas,
  resolveCanvasColor,
  serializeCanvas,
} from './jsonCanvas'

describe('parseCanvas', () => {
  it('treats empty content as an empty canvas', () => {
    expect(parseCanvas('')).toEqual(emptyCanvas())
    expect(parseCanvas('  \n')).toEqual(emptyCanvas())
  })

  it('throws on invalid JSON', () => {
    expect(() => parseCanvas('{"nodes": [')).toThrow()
    expect(() => parseCanvas('[]')).toThrow()
  })

  it('keeps unknown fields and drops nodes without id or type', () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          { id: 'a', type: 'text', text: 'hi', x: 1, y: 2, width: 3, height: 4, custom: true },
          { type: 'text', text: 'no id' },
        ],
        edges: [{ id: 'e', fromNode: 'a', toNode: 'a', label: 'x' }, { id: 'broken' }],
        extra: { keep: 1 },
      }),
    )
    expect(doc.nodes).toEqual([
      { id: 'a', type: 'text', text: 'hi', x: 1, y: 2, width: 3, height: 4, custom: true },
    ])
    expect(doc.edges).toEqual([{ id: 'e', fromNode: 'a', toNode: 'a', label: 'x' }])
    expect(doc.extra).toEqual({ keep: 1 })
  })

  it('fills missing geometry and text', () => {
    const [node] = parseCanvas('{"nodes":[{"id":"a","type":"text"}]}').nodes
    expect(node).toMatchObject({ x: 0, y: 0, width: 250, height: 60, text: '' })
  })
})

describe('serializeCanvas', () => {
  it('writes one node per line and round-trips', () => {
    const doc = parseCanvas(
      JSON.stringify({
        nodes: [
          { id: 'a', type: 'text', text: 'one\ntwo', x: 0, y: 0, width: 10, height: 10 },
          { id: 'b', type: 'file', file: 'img/a.png', x: 20, y: 0, width: 10, height: 10 },
        ],
        edges: [],
      }),
    )
    const text = serializeCanvas(doc)
    expect(text).toBe(
      [
        '{',
        '\t"nodes":[',
        '\t\t{"id":"a","type":"text","text":"one\\ntwo","x":0,"y":0,"width":10,"height":10},',
        '\t\t{"id":"b","type":"file","file":"img/a.png","x":20,"y":0,"width":10,"height":10}',
        '\t],',
        '\t"edges":[]',
        '}',
        '',
      ].join('\n'),
    )
    expect(parseCanvas(text)).toEqual(doc)
  })

  it('serializes an empty canvas', () => {
    expect(serializeCanvas(emptyCanvas())).toBe('{\n\t"nodes":[],\n\t"edges":[]\n}\n')
  })
})

describe('canvas text', () => {
  const doc = parseCanvas(
    JSON.stringify({
      nodes: [
        { id: 'b', type: 'text', text: 'Second', x: 0, y: 100, width: 10, height: 10 },
        { id: 'g', type: 'group', label: 'Frame', x: 0, y: -50, width: 10, height: 10 },
        { id: 'a', type: 'text', text: 'First', x: 0, y: 0, width: 10, height: 10 },
        { id: 'f', type: 'file', file: 'notes/x.md', x: 0, y: 200, width: 10, height: 10 },
      ],
    }),
  )

  it('collects text in reading order', () => {
    expect(canvasPlainText(doc)).toBe('# Frame\n\nFirst\n\nSecond\n\nnotes/x.md')
  })

  it('builds previews', () => {
    expect(canvasPreviewFromContent(serializeCanvas(doc))).toBe(
      '**Frame**\nFirst\nSecond\nnotes/x.md',
    )
    expect(canvasPreviewFromContent(serializeCanvas(emptyCanvas()))).toBe('Empty whiteboard')
  })
})

describe('resolveCanvasColor', () => {
  it('maps presets and accepts hex', () => {
    expect(resolveCanvasColor('1')).toBe('#e5484d')
    expect(resolveCanvasColor('#abc')).toBe('#abc')
    expect(resolveCanvasColor('red')).toBeNull()
    expect(resolveCanvasColor(undefined)).toBeNull()
  })
})
