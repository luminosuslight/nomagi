import { listItemSchema } from '@milkdown/kit/preset/commonmark'
import { liftListItem } from '@milkdown/prose/schema-list'
import { TextSelection } from '@milkdown/prose/state'
import { $shortcut } from '@milkdown/kit/utils'

import {
  isAtStartOfTextblock,
  isNestedListItem,
  selectionInListItem,
} from '@/lib/milkdown/listIndent/listIndentUtils'

/// Backspace at the start of a nested list line outdents (same as Shift-Tab).
export const listOutdentBackspaceShortcut = $shortcut((ctx) => {
  const itemType = listItemSchema.type(ctx)
  const lift = liftListItem(itemType)

  return {
    Backspace: {
      key: 'Backspace',
      priority: 100,
      onRun: () => (state, dispatch, view) => {
        const { selection } = state
        if (!(selection instanceof TextSelection) || !selection.empty) {
          return false
        }

        const { $from } = selection
        if (!isAtStartOfTextblock($from)) return false
        if (!selectionInListItem($from.depth, (d) => $from.node(d), itemType.name)) {
          return false
        }
        if (!isNestedListItem($from, itemType)) return false

        return lift(state, dispatch, view)
      },
    },
  }
})
