import type { Node } from '@milkdown/prose/model'
import type { NodeViewConstructor } from '@milkdown/prose/view'

import { $view } from '@milkdown/kit/utils'
import { createApp, ref, watchEffect } from 'vue'

import SheetBlock from '@/components/sheet/SheetBlock.vue'
import { shouldStopDrawingEvent } from '@/lib/drawing/pointerEvents'
import { drawingEditingCtx, drawingOverlayRootCtx } from '@/lib/milkdown/drawing/overlayCtx'
import { sheetSchema } from '@/lib/milkdown/sheet/sheetSchema'
import { watchNodeViewEditable } from '@/lib/milkdown/drawing/watchNodeViewEditable'
import { emptySheet, type SheetCell } from '@/lib/sheet/sheetTypes'

export const sheetView = $view(sheetSchema.node, (ctx): NodeViewConstructor => {
  return (initialNode, view, getPos) => {
    const dom = document.createElement('div')
    dom.className = 'milkdown-sheet-block my-4'
    dom.contentEditable = 'false'

    const cells = ref((initialNode.attrs.cells as SheetCell[][]) ?? emptySheet())
    const editable = ref(view.editable)
    const selected = ref(false)
    const overlayRoot = ctx.get(drawingOverlayRootCtx.key)
    const drawingEditing = ctx.get(drawingEditingCtx.key)

    const setCells = (nextCells: SheetCell[][]) => {
      const pos = getPos()
      if (pos == null) return
      view.dispatch(view.state.tr.setNodeAttribute(pos, 'cells', nextCells))
    }

    const app = createApp(SheetBlock, {
      cells,
      editable,
      overlayRoot,
      drawingEditing,
      onUpdateCells: setCells,
    })

    const bindAttrs = (node: Node) => {
      cells.value = (node.attrs.cells as SheetCell[][]) ?? emptySheet()
    }

    bindAttrs(initialNode)

    const disposeEditableWatcher = watchNodeViewEditable(view, editable, drawingEditing)

    const disposeSelectedWatcher = watchEffect(() => {
      if (selected.value) dom.classList.add('selected')
      else dom.classList.remove('selected')
    })

    app.mount(dom)

    return {
      dom,
      update: (updatedNode) => {
        if (updatedNode.type !== initialNode.type) return false
        bindAttrs(updatedNode)
        return true
      },
      stopEvent: (event) => shouldStopDrawingEvent(event),
      ignoreMutation: () => true,
      selectNode: () => {
        selected.value = true
      },
      deselectNode: () => {
        selected.value = false
      },
      destroy: () => {
        disposeEditableWatcher?.()
        disposeSelectedWatcher()
        app.unmount()
        dom.remove()
      },
    }
  }
})
