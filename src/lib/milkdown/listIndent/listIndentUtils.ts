import type { NodeType } from '@milkdown/prose/model'
import type { ResolvedPos } from '@milkdown/prose/model'

export function selectionInListItem(
  depth: number,
  nodeAtDepth: (d: number) => { type: { name: string } },
  listItemTypeName: string,
): boolean {
  for (let d = depth; d > 0; d--) {
    if (nodeAtDepth(d).type.name === listItemTypeName) return true
  }
  return false
}

/** True when the innermost list item sits inside another list item (nested / indented). */
export function isNestedListItem($from: ResolvedPos, itemType: NodeType): boolean {
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === itemType) {
      return d >= 2 && $from.node(d - 2).type === itemType
    }
  }
  return false
}

export function isAtStartOfTextblock($from: ResolvedPos): boolean {
  return $from.parent.isTextblock && $from.parentOffset === 0
}
