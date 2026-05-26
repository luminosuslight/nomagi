import { $ctx } from '@milkdown/kit/utils'
import type { Ref } from 'vue'

export const drawingOverlayRootCtx = $ctx(
  null as Ref<HTMLElement | null> | null,
  'drawingOverlayRoot',
)

export const drawingEditingCtx = $ctx(
  null as Ref<boolean> | null,
  'drawingEditing',
)
