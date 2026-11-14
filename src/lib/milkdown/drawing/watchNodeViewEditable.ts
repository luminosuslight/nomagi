import type { EditorView } from '@milkdown/prose/view'
import type { Ref } from 'vue'
import { nextTick, watch, type WatchStopHandle } from 'vue'

/**
 * Keep the inline Edit control in sync when an overlay toggles editor readonly.
 * `setReadonly` and this watch can run in either order, so sync again after the
 * readonly change has been applied.
 */
export function watchNodeViewEditable(
  view: EditorView,
  editable: Ref<boolean>,
  drawingEditing: Ref<boolean> | null | undefined,
): WatchStopHandle | null {
  if (!drawingEditing) return null

  const sync = () => {
    editable.value = view.editable
  }

  return watch(
    () => drawingEditing.value,
    () => {
      sync()
      void nextTick(sync)
    },
  )
}
