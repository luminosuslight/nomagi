import type { EditorView } from '@milkdown/prose/view'
import type { Ref } from 'vue'
import { watch, type WatchStopHandle } from 'vue'

/** Keep the inline Edit control in sync when sketch mode toggles editor readonly. */
export function watchNodeViewEditable(
  view: EditorView,
  editable: Ref<boolean>,
  drawingEditing: Ref<boolean> | null | undefined,
): WatchStopHandle | null {
  if (!drawingEditing) return null

  return watch(
    () => drawingEditing.value,
    () => {
      editable.value = view.editable
    },
  )
}
