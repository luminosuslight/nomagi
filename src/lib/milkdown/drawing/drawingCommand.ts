import { $command } from '@milkdown/kit/utils'

import { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'

export const insertDrawingCommand = $command('InsertDrawing', (ctx) => () => {
  return (state, dispatch) => {
    const node = drawingSchema.type(ctx).create({ lines: [] })
    if (!node) return false

    const tr = state.tr.replaceSelectionWith(node).scrollIntoView()
    if (dispatch) dispatch(tr)

    return true
  }
})
