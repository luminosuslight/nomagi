const INTERACTIVE_CONTROL_SELECTOR =
  '[data-drawing-controls] button, [data-drawing-controls] input, [data-drawing-controls] label, [data-drawing-controls] [role=slider]'

function isInteractiveControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(INTERACTIVE_CONTROL_SELECTOR)
}

function isCanvasTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-drawing-canvas]')
}

export function installDrawingPointerCapture(
  overlay: HTMLElement,
  handlers: {
    onDown: (event: PointerEvent) => void
    onMove: (event: PointerEvent) => void
    onUp: (event: PointerEvent) => void
  },
): () => void {
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isInteractiveControl(event.target)) return

    if (!isCanvasTarget(event.target)) {
      event.preventDefault()
      return
    }

    handlers.onDown(event)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (isInteractiveControl(event.target)) return
    handlers.onMove(event)
  }

  const onPointerEnd = (event: PointerEvent) => {
    handlers.onUp(event)
  }

  const options: AddEventListenerOptions = { capture: true }

  overlay.addEventListener('pointerdown', onPointerDown, options)
  overlay.addEventListener('pointermove', onPointerMove, options)
  overlay.addEventListener('pointerup', onPointerEnd, options)
  overlay.addEventListener('pointercancel', onPointerEnd, options)

  return () => {
    overlay.removeEventListener('pointerdown', onPointerDown, options)
    overlay.removeEventListener('pointermove', onPointerMove, options)
    overlay.removeEventListener('pointerup', onPointerEnd, options)
    overlay.removeEventListener('pointercancel', onPointerEnd, options)
  }
}
