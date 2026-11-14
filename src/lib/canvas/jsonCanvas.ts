import { previewFromContent } from '@/lib/noteDisplay'

/**
 * JSON Canvas 1.0 (https://jsoncanvas.org). Unknown fields on the document, nodes and edges
 * are kept as-is so files written by other apps (e.g. Obsidian) round-trip without loss.
 */
export type CanvasColor = string

type CanvasNodeBase = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color?: CanvasColor
  [key: string]: unknown
}

export type CanvasTextNode = CanvasNodeBase & { type: 'text'; text: string }
export type CanvasFileNode = CanvasNodeBase & { type: 'file'; file: string; subpath?: string }
export type CanvasLinkNode = CanvasNodeBase & { type: 'link'; url: string }
export type CanvasGroupNode = CanvasNodeBase & {
  type: 'group'
  label?: string
  background?: string
  backgroundStyle?: 'cover' | 'ratio' | 'repeat'
}
export type CanvasUnknownNode = CanvasNodeBase & { type: string }

export type CanvasNode =
  CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode | CanvasUnknownNode

export type CanvasEdge = { id: string; fromNode: string; toNode: string; [key: string]: unknown }

export type CanvasDocument = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  [key: string]: unknown
}

export const CANVAS_EXTENSION = '.canvas'

export function emptyCanvas(): CanvasDocument {
  return { nodes: [], edges: [] }
}

export function isTextNode(node: CanvasNode): node is CanvasTextNode {
  return node.type === 'text'
}

export function isFileNode(node: CanvasNode): node is CanvasFileNode {
  return node.type === 'file'
}

export function isLinkNode(node: CanvasNode): node is CanvasLinkNode {
  return node.type === 'link'
}

export function isGroupNode(node: CanvasNode): node is CanvasGroupNode {
  return node.type === 'group'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeNode(raw: Record<string, unknown>): CanvasNode | null {
  if (typeof raw.id !== 'string' || typeof raw.type !== 'string') return null
  const node = {
    ...raw,
    x: finiteOr(raw.x, 0),
    y: finiteOr(raw.y, 0),
    width: finiteOr(raw.width, 250),
    height: finiteOr(raw.height, 60),
  } as CanvasNode
  if (node.type === 'text' && typeof node.text !== 'string') node.text = ''
  if (node.type === 'file' && typeof node.file !== 'string') node.file = ''
  if (node.type === 'link' && typeof node.url !== 'string') node.url = ''
  return node
}

/** Throws on invalid JSON. Empty content is an empty canvas. */
export function parseCanvas(text: string): CanvasDocument {
  if (!text.trim()) return emptyCanvas()
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) throw new Error('Canvas file must contain a JSON object')

  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes
        .filter(isRecord)
        .map(normalizeNode)
        .filter((node) => node !== null)
    : []
  const edges = Array.isArray(parsed.edges)
    ? (parsed.edges.filter(
        (edge) =>
          isRecord(edge) &&
          typeof edge.id === 'string' &&
          typeof edge.fromNode === 'string' &&
          typeof edge.toNode === 'string',
      ) as CanvasEdge[])
    : []
  return { ...parsed, nodes, edges }
}

function serializeArray(items: unknown[]): string {
  if (items.length === 0) return '[]'
  return `[\n${items.map((item) => `\t\t${JSON.stringify(item)}`).join(',\n')}\n\t]`
}

/**
 * One node / edge per line keeps git diffs and line-based tooling readable.
 * Key order follows the document (`nodes`, `edges`, then anything else).
 */
export function serializeCanvas(doc: CanvasDocument): string {
  const { nodes, edges, ...rest } = doc
  const entries = [
    `\t"nodes":${serializeArray(nodes)}`,
    `\t"edges":${serializeArray(edges)}`,
    ...Object.entries(rest)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `\t${JSON.stringify(key)}:${JSON.stringify(value)}`),
  ]
  return `{\n${entries.join(',\n')}\n}\n`
}

export function createCanvasId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Preset colors from the spec: 1 red, 2 orange, 3 yellow, 4 green, 5 cyan, 6 purple. */
export const CANVAS_PRESET_COLORS: Record<string, string> = {
  '1': '#e5484d',
  '2': '#f76b15',
  '3': '#e2b400',
  '4': '#30a46c',
  '5': '#00a2c7',
  '6': '#8e4ec6',
}

export function resolveCanvasColor(color: CanvasColor | undefined): string | null {
  if (!color) return null
  if (CANVAS_PRESET_COLORS[color]) return CANVAS_PRESET_COLORS[color]
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : null
}

/** Reading order: top to bottom, then left to right. */
function inReadingOrder(nodes: CanvasNode[]): CanvasNode[] {
  return [...nodes].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Searchable text of a canvas: note texts, group labels, file paths and URLs. */
export function canvasPlainText(doc: CanvasDocument): string {
  return inReadingOrder(doc.nodes)
    .map((node) => {
      if (isTextNode(node)) return node.text
      if (isGroupNode(node)) return node.label ? `# ${node.label}` : ''
      if (isFileNode(node)) return node.file
      if (isLinkNode(node)) return node.url
      return ''
    })
    .filter((text) => text.trim())
    .join('\n\n')
}

export function canvasPlainTextFromContent(content: string): string {
  try {
    return canvasPlainText(parseCanvas(content))
  } catch {
    return content
  }
}

export function canvasPreviewFromContent(content: string): string {
  const text = canvasPlainTextFromContent(content)
  return text.trim() ? previewFromContent(text) : 'Empty whiteboard'
}
