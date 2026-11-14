import { editorViewOptionsCtx } from '@milkdown/kit/core'
import type { Ctx } from '@milkdown/kit/ctx'
import type { EditorState, Transaction } from '@milkdown/prose/state'
import { TextSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

import { isImageUrl } from '@/lib/milkdown/images/imageUrls'

/** Block image when pasted into an empty top-level paragraph, inline image otherwise. */
export function insertImageTransaction(state: EditorState, src: string): Transaction | null {
  const { selection } = state
  const { $from } = selection
  const blockType = state.schema.nodes['image-block']
  const inlineType = state.schema.nodes.image

  const parent = $from.parent
  if (
    blockType &&
    selection.empty &&
    parent.type.name === 'paragraph' &&
    parent.content.size === 0
  ) {
    const container = $from.node(-1)
    const index = $from.index(-1)
    if (container.canReplaceWith(index, index + 1, blockType)) {
      const start = $from.before()
      const node = blockType.create({ src })
      const tr = state.tr.replaceWith(start, $from.after(), node)
      return tr.setSelection(TextSelection.near(tr.doc.resolve(start + node.nodeSize)))
    }
  }

  if (!inlineType || !parent.inlineContent || !parent.type.contentMatch.matchType(inlineType)) {
    return null
  }
  return state.tr.replaceSelectionWith(inlineType.create({ src }), false)
}

function handleImageUrlPaste(view: EditorView, event: ClipboardEvent): boolean {
  if (!view.editable) return false
  const text = event.clipboardData?.getData('text/plain').trim() ?? ''
  if (!isImageUrl(text)) return false
  if (view.state.selection.$from.parent.type.spec.code) return false

  const tr = insertImageTransaction(view.state, text)
  if (!tr) return false
  view.dispatch(tr.scrollIntoView())
  return true
}

/**
 * Registered as a view prop: ProseMirror consults view props before plugins, so this runs
 * ahead of Milkdown's clipboard plugin, which would otherwise turn the URL into a link.
 */
export function configurePasteImageUrl(ctx: Ctx) {
  ctx.update(editorViewOptionsCtx, (prev) => ({
    ...prev,
    handlePaste: (view, event, slice) =>
      handleImageUrlPaste(view, event) || (prev.handlePaste?.(view, event, slice) ?? false),
  }))
}
