import type Editor from 'js-draw'

type HtmlPointerEventType = Parameters<Editor['handleHTMLPointerEvent']>[0]

const EINK_POINTER_ID = 1

function actionToEventType(action: EinkPenSample['a']): HtmlPointerEventType {
  switch (action) {
    case 'down':
      return 'pointerdown'
    case 'move':
      return 'pointermove'
    case 'up':
      return 'pointerup'
    case 'cancel':
      return 'pointercancel'
  }
}

/** Map native overlay pixels to CSS viewport coordinates for PointerEvent clientX/Y. */
function nativeSampleToViewport(sample: EinkPenSample): { x: number; y: number } {
  const wrapper = window.__EINK_WEB_APP_WRAPPER__
  if (
    wrapper?.viewWidthPx &&
    wrapper.viewHeightPx &&
    wrapper.viewWidthPx > 0 &&
    wrapper.viewHeightPx > 0
  ) {
    return {
      x: sample.x * (window.innerWidth / wrapper.viewWidthPx),
      y: sample.y * (window.innerHeight / wrapper.viewHeightPx),
    }
  }
  const scale = wrapper?.penCoordinateScale ?? 1 / window.devicePixelRatio
  return { x: sample.x * scale, y: sample.y * scale }
}

function sampleToPointerEvent(sample: EinkPenSample): PointerEvent {
  const isContact = sample.a === 'down' || sample.a === 'move'
  const { x, y } = nativeSampleToViewport(sample)
  return new PointerEvent(actionToEventType(sample.a), {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pressure: sample.p,
    pointerId: EINK_POINTER_ID,
    pointerType: 'pen',
    buttons: isContact ? 1 : 0,
    isPrimary: true,
  })
}

/** Feed batched native stylus samples from the e-ink WebView wrapper into js-draw. */
export function installEinkWrapperPenInput(editor: Editor): () => void {
  const wrapper = window.__EINK_WEB_APP_WRAPPER__
  if (!wrapper?.registerPenListener) return () => {}

  const listener = (batch: EinkPenBatch) => {
    for (const sample of batch.samples) {
      const eventType = actionToEventType(sample.a)
      editor.handleHTMLPointerEvent(eventType, sampleToPointerEvent(sample))
    }
  }

  wrapper.registerPenListener(listener)
  return () => wrapper.registerPenListener(null)
}
