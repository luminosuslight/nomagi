import type { Ctx } from '@milkdown/ctx'
import { linkPreviewTooltip, linkTooltipState } from '@milkdown/kit/component/link-tooltip'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { getMarkRange, posToDOMRect } from '@milkdown/prose'
import type { Mark } from '@milkdown/prose/model'
import type { PluginView } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'

interface LinkPreviewView extends PluginView {
  show: (mark: Mark, from: number, to: number, rect: DOMRect) => void
  hide: () => void
}

/** The link mark under a click, found from the anchor rather than the caret position. */
function linkFromEvent(ctx: Ctx, view: EditorView, event: Event) {
  const node = event.target instanceof Node ? event.target : null
  const el = node instanceof Element ? node : node?.parentElement
  const anchor = el?.closest('a')
  if (!anchor || !view.dom.contains(anchor)) return
  try {
    const pos = view.posAtDOM(anchor, 0)
    return getMarkRange(view.state.doc.resolve(pos), linkSchema.type(ctx))
  } catch {
    return
  }
}

function plainClick(event: MouseEvent) {
  return event.button === 0 && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey
}

/**
 * Crepe opens its link dialog on hover. Show it on click instead, so a tap can
 * offer open and edit without following the link immediately.
 */
export function configureLinkPreviewClick(ctx: Ctx) {
  ctx.update(linkPreviewTooltip.key, (spec) => {
    let preview: LinkPreviewView | null = null
    return {
      ...spec,
      view: (editorView) => {
        const created = spec.view?.(editorView) as LinkPreviewView | undefined
        preview = created ?? null
        const onPointerDown = (event: PointerEvent) => {
          const target = event.target
          if (!(target instanceof Node) || editorView.dom.contains(target)) return
          const el = target instanceof Element ? target : target.parentElement
          if (el?.closest('.milkdown-link-preview, .milkdown-link-edit')) return
          preview?.hide()
        }
        const doc = editorView.dom.ownerDocument
        doc.addEventListener('pointerdown', onPointerDown, true)
        return {
          update: (view, prev) => created?.update?.(view, prev),
          destroy: () => {
            doc.removeEventListener('pointerdown', onPointerDown, true)
            created?.destroy?.()
          },
        }
      },
      props: {
        handleDOMEvents: {
          mousedown: (view, event) => {
            if (!preview || !plainClick(event)) return false
            const link = linkFromEvent(ctx, view, event)
            if (!link) {
              preview.hide()
              return false
            }
            if (ctx.get(linkTooltipState.key).mode === 'edit') return false
            event.preventDefault()
            preview.show(link.mark, link.from, link.to, posToDOMRect(view, link.from, link.to))
            return true
          },
          click: (view, event) => {
            if (!plainClick(event) || !linkFromEvent(ctx, view, event)) return false
            event.preventDefault()
            return true
          },
        },
      },
    }
  })
}
