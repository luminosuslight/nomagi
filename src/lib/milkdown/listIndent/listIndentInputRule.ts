import { InputRule } from '@milkdown/kit/prose/inputrules'
import { listItemSchema } from '@milkdown/kit/preset/commonmark'
import { sinkListItem } from '@milkdown/prose/schema-list'
import type { Transaction } from '@milkdown/prose/state'
import { $inputRule } from '@milkdown/kit/utils'

import { selectionInListItem } from '@/lib/milkdown/listIndent/listIndentUtils'

/// When two spaces are typed at the start of a list item paragraph, nest the item
/// (same as Tab) so mobile keyboards can indent without a Tab key.
export const listIndentSpaceInputRule = $inputRule((ctx) => {
  const itemType = listItemSchema.type(ctx)
  const sink = sinkListItem(itemType)

  return new InputRule(/^ {2}$/, (state, _match, start, end) => {
    const { $from } = state.selection
    if (!selectionInListItem($from.depth, (d) => $from.node(d), itemType.name)) {
      return null
    }

    // Nest first, then drop the trigger spaces. Chaining sink's ReplaceAroundStep
    // after a delete step fails to map ("Gap is not a flat range").
    let sinkTr: Transaction | undefined
    if (
      !sink(state, (t) => {
        sinkTr = t
      }) ||
      !sinkTr
    ) {
      return null
    }

    const deleteFrom = sinkTr.mapping.map(start)
    const deleteTo = sinkTr.mapping.map(end)
    if (deleteFrom === deleteTo) {
      return sinkTr
    }

    return sinkTr.delete(deleteFrom, deleteTo)
  })
})
