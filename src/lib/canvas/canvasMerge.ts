import {
  emptyCanvas,
  parseCanvas,
  serializeCanvas,
  type CanvasDocument,
} from '@/lib/canvas/jsonCanvas'
import { mergeText } from '@/lib/textMerge'

type Item = { id: string; [key: string]: unknown }

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function same(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}

function mergeField(key: string, base: unknown, ours: unknown, theirs: unknown): unknown {
  if (same(ours, theirs)) return ours
  if (same(base, ours)) return theirs
  if (same(base, theirs)) return ours
  if (key === 'text' && typeof ours === 'string' && typeof theirs === 'string') {
    return mergeText(typeof base === 'string' ? base : '', ours, theirs)
  }
  return ours
}

/** Field-wise 3-way merge; when both sides changed a field differently, ours wins (text is combined). */
function mergeRecord<T extends Record<string, unknown>>(
  base: Record<string, unknown> | undefined,
  ours: T,
  theirs: T,
): T {
  const keys = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])]
  const merged: Record<string, unknown> = {}
  for (const key of keys) {
    const value = mergeField(key, base?.[key], ours[key], theirs[key])
    if (value !== undefined) merged[key] = value
  }
  return merged as T
}

/**
 * Merge lists of items by id. Order (= z-order for nodes) follows ours, with items only
 * added on their side appended. An item deleted on one side but edited on the other is kept.
 */
function mergeItems<T extends Item>(base: T[], ours: T[], theirs: T[]): T[] {
  const baseById = new Map(base.map((item) => [item.id, item]))
  const oursById = new Map(ours.map((item) => [item.id, item]))
  const theirsById = new Map(theirs.map((item) => [item.id, item]))
  const ids = [...new Set([...ours.map((item) => item.id), ...theirs.map((item) => item.id)])]

  const merged: T[] = []
  for (const id of ids) {
    const b = baseById.get(id)
    const o = oursById.get(id)
    const t = theirsById.get(id)
    if (o && t) {
      merged.push(mergeRecord(b, o, t))
      continue
    }
    const survivor = o ?? t!
    if (!b || !same(b, survivor)) merged.push(survivor)
  }
  return merged
}

export function mergeCanvasDocuments(
  base: CanvasDocument,
  ours: CanvasDocument,
  theirs: CanvasDocument,
): CanvasDocument {
  const { nodes: baseNodes, edges: baseEdges, ...baseRest } = base
  const { nodes: ourNodes, edges: ourEdges, ...ourRest } = ours
  const { nodes: theirNodes, edges: theirEdges, ...theirRest } = theirs

  const nodes = mergeItems(baseNodes, ourNodes, theirNodes)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = mergeItems(baseEdges, ourEdges, theirEdges).filter(
    (edge) => nodeIds.has(edge.fromNode) && nodeIds.has(edge.toNode),
  )
  return { ...mergeRecord(baseRest, ourRest, theirRest), nodes, edges }
}

function tryParse(text: string): CanvasDocument | null {
  try {
    return parseCanvas(text)
  } catch {
    return null
  }
}

/** Never fails: unparseable sides fall back to the side that still parses. */
export function mergeCanvasText(baseText: string, ourText: string, theirText: string): string {
  if (ourText === theirText || theirText === baseText) return ourText
  if (ourText === baseText) return theirText

  const ours = tryParse(ourText)
  const theirs = tryParse(theirText)
  if (!ours && !theirs) return mergeText(baseText, ourText, theirText)
  if (!ours) return theirText
  if (!theirs) return ourText

  const base = tryParse(baseText) ?? emptyCanvas()
  return serializeCanvas(mergeCanvasDocuments(base, ours, theirs))
}
