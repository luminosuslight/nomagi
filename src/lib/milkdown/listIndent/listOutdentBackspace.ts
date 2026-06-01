import type { Ctx } from '@milkdown/kit/ctx'
import { listItemSchema } from '@milkdown/kit/preset/commonmark'
import { liftListItem } from '@milkdown/prose/schema-list'
import { Plugin } from '@milkdown/prose/state'
import { TextSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { $prose } from '@milkdown/kit/utils'

import {
  getInnerListItem,
  isFirstListItemInContainingList,
  isNestedListItem,
  isTaskListItem,
  selectionAtTextblockLineStart,
  selectionInListItem,
  shouldOutdentNestedListOnBackspace,
  textblockLineStartPos,
} from '@/lib/milkdown/listIndent/listIndentUtils'

function createTryOutdent(ctx: Ctx) {
  const itemType = listItemSchema.type(ctx)
  const lift = liftListItem(itemType)

  return (view: EditorView): boolean => {
    const { state } = view
    const { selection } = state
    if (!(selection instanceof TextSelection) || !selection.empty) {
      return false
    }

    const { $from } = selection
    if (!selectionInListItem($from.depth, (d) => $from.node(d), itemType.name)) {
      return false
    }
    if (!isNestedListItem($from, itemType)) return false
    if (!shouldOutdentNestedListOnBackspace($from, view, state)) return false

    const listItem = getInnerListItem($from, itemType)
    if (!listItem) return false
    // With a previous sibling in the same sub-list, Backspace should join/delete, not outdent.
    if (!isFirstListItemInContainingList($from, listItem.depth)) return false

    const lineStart = textblockLineStartPos($from, listItem.depth)
    let tr = state.tr
    if ($from.pos !== lineStart) {
      tr = tr.setSelection(TextSelection.create(tr.doc, lineStart))
    }

    const afterSel = state.apply(tr)
    const caretAtLineStart = afterSel.selection.from
    let liftTr: typeof tr | undefined
    if (
      lift(afterSel, (t) => {
        liftTr = t
      }) &&
      liftTr
    ) {
      const mappedStart = liftTr.mapping.map(caretAtLineStart, -1)
      const fixed =
        liftTr.selection.from === mappedStart
          ? liftTr
          : liftTr.setSelection(TextSelection.create(liftTr.doc, mappedStart))
      view.dispatch(selectionAtTextblockLineStart(fixed, itemType))
      return true
    }

    // Block joinBackward / DOM reconciliation from demoting a nested task to a bullet.
    return isTaskListItem($from, itemType)
  }
}

/**
 * Outdent nested list items on Backspace at line start. Uses capture-phase DOM
 * listeners so we run before ProseMirror applies mobile `beforeinput` / DOM flush.
 */
export const listOutdentBackspacePlugin = $prose((ctx) => {
  const tryOutdent = createTryOutdent(ctx)

  return new Plugin({
    view(view) {
      const stopEvent = (event: Event) => {
        if (!tryOutdent(view)) return
        event.preventDefault()
        event.stopImmediatePropagation()
      }

      const onBeforeInput = (event: Event) => {
        if ((event as InputEvent).inputType !== 'deleteContentBackward') return
        stopEvent(event)
      }

      const onKeyDown = (event: Event) => {
        if ((event as KeyboardEvent).key !== 'Backspace') return
        stopEvent(event)
      }

      view.dom.addEventListener('beforeinput', onBeforeInput, true)
      view.dom.addEventListener('keydown', onKeyDown, true)

      return {
        destroy() {
          view.dom.removeEventListener('beforeinput', onBeforeInput, true)
          view.dom.removeEventListener('keydown', onKeyDown, true)
        },
      }
    },
  })
})
