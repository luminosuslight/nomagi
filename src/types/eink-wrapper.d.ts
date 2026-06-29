interface EinkPenSample {
  a: 'down' | 'move' | 'up' | 'cancel'
  x: number
  y: number
  p: number
  /** Uptime millis (matches Android MotionEvent eventTime). */
  t: number
}

interface EinkPenBatch {
  samples: EinkPenSample[]
}

interface EinkWebAppWrapper {
  protocolVersion: number
  penBridgeMode: string
  /** WebView width in physical view pixels (matches native pen samples). */
  viewWidthPx?: number
  /** WebView height in physical view pixels (matches native pen samples). */
  viewHeightPx?: number
  /** Fallback scale when view dimensions are unavailable (CSS px per native px). */
  penCoordinateScale?: number
  registerPenListener: (listener: ((batch: EinkPenBatch) => void) | null) => void
  deliverPenBatch: (batch: EinkPenBatch) => void
}

interface Window {
  __EINK_WEB_APP_WRAPPER__?: EinkWebAppWrapper
}
