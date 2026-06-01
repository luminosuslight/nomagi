import type { Node, NodeType, ResolvedPos } from '@milkdown/prose/model'
import type { EditorState, Transaction } from '@milkdown/prose/state'
import { TextSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

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

export function getInnerListItem(
  $from: ResolvedPos,
  itemType: NodeType,
): { node: Node; depth: number } | null {
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === itemType) {
      return { node: $from.node(d), depth: d }
    }
  }
  return null
}

export function isTaskListItem($from: ResolvedPos, itemType: NodeType): boolean {
  const item = getInnerListItem($from, itemType)
  return item != null && item.node.attrs.checked != null
}

/** True when this list item is the first entry in its immediate bullet/ordered list. */
export function isFirstListItemInContainingList(
  $from: ResolvedPos,
  listItemDepth: number,
): boolean {
  return $from.index(listItemDepth - 1) === 0
}

/**
 * Whether Backspace at this position should outdent a nested list item instead of
 * joining/unwrapping (which strips task checkboxes on mobile).
 */
export function shouldOutdentNestedListOnBackspace(
  $from: ResolvedPos,
  view?: EditorView,
  state?: EditorState,
): boolean {
  if (!$from.parent.isTextblock) return false
  if ($from.parentOffset === 0) return true
  if ($from.parent.content.size === 0) return true
  if (view && state && view.endOfTextblock('backward', state)) return true
  return false
}

/** First text position inside the list item paragraph that contains `$from`. */
export function textblockLineStartPos($from: ResolvedPos, listItemDepth: number): number {
  const paraDepth = listItemDepth + 1
  if ($from.depth === paraDepth && $from.parentOffset === 0) {
    return $from.pos
  }
  return $from.start(paraDepth) + 1
}

/** Keep the caret at the beginning of the list item paragraph after a structural step. */
export function selectionAtTextblockLineStart(tr: Transaction, itemType: NodeType): Transaction {
  const item = getInnerListItem(tr.selection.$from, itemType)
  if (!item) return tr
  const lineStart = textblockLineStartPos(tr.selection.$from, item.depth)
  if (tr.selection.from === lineStart) return tr
  return tr.setSelection(TextSelection.create(tr.doc, lineStart))
}
