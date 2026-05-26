export { drawingRemark } from '@/lib/milkdown/drawing/drawingRemark'
export { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'
export { drawingView } from '@/lib/milkdown/drawing/drawingView'
export { insertDrawingCommand } from '@/lib/milkdown/drawing/drawingCommand'
export { drawingEditingCtx, drawingOverlayRootCtx } from '@/lib/milkdown/drawing/overlayCtx'

import { drawingEditingCtx, drawingOverlayRootCtx } from '@/lib/milkdown/drawing/overlayCtx'
import { drawingRemark } from '@/lib/milkdown/drawing/drawingRemark'
import { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'
import { drawingView } from '@/lib/milkdown/drawing/drawingView'
import { insertDrawingCommand } from '@/lib/milkdown/drawing/drawingCommand'

export const drawingPlugins = [
  drawingOverlayRootCtx,
  drawingEditingCtx,
  drawingRemark,
  ...drawingSchema,
  drawingView,
  insertDrawingCommand,
] as const
