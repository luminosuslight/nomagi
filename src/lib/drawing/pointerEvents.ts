export const DRAWING_POINTER_EVENTS = new Set([
  'mousedown',
  'mouseup',
  'mousemove',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointercancel',
])

export function shouldStopDrawingEvent(event: Event): boolean {
  const target = event.target
  if (!(target instanceof Element)) return false

  if (target.closest('[data-drawing-canvas]')) {
    return DRAWING_POINTER_EVENTS.has(event.type)
  }

  if (target.closest('[data-drawing-controls]') || target.closest('[data-drawing-edit]')) {
    return event.type === 'mousedown' || event.type === 'touchstart' || event.type === 'pointerdown'
  }

  if (target.closest('[data-drawing-editor]')) {
    return DRAWING_POINTER_EVENTS.has(event.type)
  }

  return false
}
