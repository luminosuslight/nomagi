import type { BlockEditFeatureConfig } from '@milkdown/crepe/feature/block-edit'
import { commandsCtx } from '@milkdown/kit/core'
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
} from '@milkdown/kit/preset/commonmark'

import { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'
import { jsDrawSchema } from '@/lib/milkdown/jsDraw/jsDrawSchema'

/** Pencil icon for the slash menu (matches lucide Pencil proportions). */
const sketchIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
`

/** Pen-tool icon for the js-draw slash menu entry. */
const jsDrawIcon = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
`

export const sketchSlashMenuConfig: Pick<BlockEditFeatureConfig, 'buildMenu'> = {
  buildMenu(builder) {
    const advanced = builder.getGroup('advanced')

    advanced.addItem('sketch', {
      label: 'Sketch',
      icon: sketchIcon,
      onRun: (ctx) => {
        const commands = ctx.get(commandsCtx)
        const drawing = drawingSchema.type(ctx)

        commands.call(clearTextInCurrentBlockCommand.key)
        commands.call(addBlockTypeCommand.key, {
          nodeType: drawing,
          attrs: { lines: [] },
        })
      },
    })

    advanced.addItem('js-draw', {
      label: 'Draw',
      icon: jsDrawIcon,
      onRun: (ctx) => {
        const commands = ctx.get(commandsCtx)
        const jsDraw = jsDrawSchema.type(ctx)

        commands.call(clearTextInCurrentBlockCommand.key)
        commands.call(addBlockTypeCommand.key, {
          nodeType: jsDraw,
          attrs: { svgMarkup: '' },
        })
      },
    })
  },
}
