import type { BlockEditFeatureConfig } from '@milkdown/crepe/feature/block-edit'
import { commandsCtx } from '@milkdown/kit/core'
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
} from '@milkdown/kit/preset/commonmark'

import { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'
import { jsDrawSchema } from '@/lib/milkdown/jsDraw/jsDrawSchema'
import { sheetSchema } from '@/lib/milkdown/sheet/sheetSchema'
import { emptySheet } from '@/lib/sheet/sheetTypes'

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

const spreadsheetIcon = `
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
    <path d="M12 3v18" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
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

    advanced.addItem('spreadsheet', {
      label: 'Spreadsheet',
      icon: spreadsheetIcon,
      onRun: (ctx) => {
        const commands = ctx.get(commandsCtx)
        const sheet = sheetSchema.type(ctx)

        commands.call(clearTextInCurrentBlockCommand.key)
        commands.call(addBlockTypeCommand.key, {
          nodeType: sheet,
          attrs: { cells: emptySheet() },
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
