import type { Node } from '@milkdown/prose/model'
import type { NodeViewConstructor } from '@milkdown/prose/view'

import { $view } from '@milkdown/kit/utils'
import { createApp, ref, watchEffect } from 'vue'

import JsDrawBlock from '@/components/drawing/JsDrawBlock.vue'
import { shouldStopDrawingEvent } from '@/lib/drawing/pointerEvents'
import { jsDrawSchema } from '@/lib/milkdown/jsDraw/jsDrawSchema'
import { drawingEditingCtx, drawingOverlayRootCtx } from '@/lib/milkdown/drawing/overlayCtx'

export const jsDrawView = $view(jsDrawSchema.node, (ctx): NodeViewConstructor => {
  return (initialNode, view, getPos) => {
    const dom = document.createElement('div')
    dom.className = 'milkdown-js-draw-block my-4'
    dom.contentEditable = 'false'

    const svgMarkup = ref(initialNode.attrs.svgMarkup as string)
    const editable = ref(view.editable)
    const selected = ref(false)
    const overlayRoot = ctx.get(drawingOverlayRootCtx.key)
    const drawingEditing = ctx.get(drawingEditingCtx.key)

    const setSvgMarkup = (nextMarkup: string) => {
      if (!view.editable) return

      const pos = getPos()
      if (pos == null) return

      view.dispatch(view.state.tr.setNodeAttribute(pos, 'svgMarkup', nextMarkup))
    }

    const app = createApp(JsDrawBlock, {
      svgMarkup,
      editable,
      overlayRoot,
      drawingEditing,
      onUpdateSvgMarkup: setSvgMarkup,
    })

    const bindAttrs = (node: Node) => {
      svgMarkup.value = node.attrs.svgMarkup as string
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
})
