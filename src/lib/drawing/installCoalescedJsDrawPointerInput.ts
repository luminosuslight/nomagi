import type Editor from 'js-draw'

import { coalescedPointerEvents } from '@/lib/drawing/pointerEvents'

type HtmlPointerEventType = Parameters<Editor['handleHTMLPointerEvent']>[0]

/** Feed coalesced stylus samples into js-draw (e.g. Apple Pencil on Safari). */
export function installCoalescedJsDrawPointerInput(editor: Editor): void {
  const original = editor.handleHTMLPointerEvent.bind(editor)

  editor.handleHTMLPointerEvent = (eventType: HtmlPointerEventType, evt: PointerEvent): boolean => {
    if (eventType !== 'pointermove') {
      return original(eventType, evt)
    }

    let handled = false
    for (const sample of coalescedPointerEvents(evt)) {
      if (original(eventType, sample)) {
        handled = true
      }
    }
    return handled
  }
}
