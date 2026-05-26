import type { BlockEditFeatureConfig } from '@milkdown/crepe/feature/block-edit'
import { commandsCtx } from '@milkdown/kit/core'
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
} from '@milkdown/kit/preset/commonmark'

import { drawingSchema } from '@/lib/milkdown/drawing/drawingSchema'

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

export const sketchSlashMenuConfig: Pick<BlockEditFeatureConfig, 'buildMenu'> = {
  buildMenu(builder) {
    builder.getGroup('advanced').addItem('sketch', {
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
  },
}
