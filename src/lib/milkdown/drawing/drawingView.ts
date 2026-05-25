import type { Node } from '@milkdown/prose/model'
import type { NodeViewConstructor } from '@milkdown/prose/view'

import { $view } from '@milkdown/kit/utils'
import { createApp, ref, watchEffect } from 'vue'

import DrawingBlock from '@/components/drawing/DrawingBlock.vue'
import type { DrawingLine } from '@/lib/drawing/drawingTypes'
import { shouldStopDrawingEvent } from '@/lib/drawing/pointerEvents'
import { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'
import { drawingOverlayRootCtx } from '@/lib/milkdown/drawing/overlayCtx'

export const drawingView = $view(
  drawingSchema.node,
  (ctx): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      const dom = document.createElement('div')
      dom.className = 'milkdown-drawing-block draw my-4'
      dom.contentEditable = 'false'

      const lines = ref(initialNode.attrs.lines as DrawingLine[])
      const editable = ref(view.editable)
      const selected = ref(false)
      const overlayRoot = ctx.get(drawingOverlayRootCtx.key)

      const setLines = (nextLines: DrawingLine[]) => {
        if (!view.editable) return

        const pos = getPos()
        if (pos == null) return

        view.dispatch(view.state.tr.setNodeAttribute(pos, 'lines', nextLines))
      }

      const app = createApp(DrawingBlock, {
        lines,
        editable,
        overlayRoot,
        onUpdateLines: setLines,
      })

      const bindAttrs = (node: Node) => {
        lines.value = node.attrs.lines as DrawingLine[]
        editable.value = view.editable
      }

      bindAttrs(initialNode)

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
          disposeSelectedWatcher()
          app.unmount()
          dom.remove()
        },
      }
    }
  },
)
