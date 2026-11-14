import { Plugin } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import type { EditorState } from '@milkdown/prose/state'
import { $prose } from '@milkdown/kit/utils'

/** Domain to show for a bare URL link (text is the URL itself), or null for links with custom text. */
export function linkChipDomain(text: string, href: string): string | null {
  if (text !== href && text !== href.replace(/^https?:\/\//, '')) return null
  try {
    const { hostname } = new URL(href)
    return hostname ? hostname.replace(/^www\./, '') : null
  } catch {
    return null
  }
}

function chipDecorations(state: EditorState): DecorationSet {
  const { from, to } = state.selection
  const decorations: Decoration[] = []

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const link = node.marks.find((mark) => mark.type.name === 'link')
    if (!link) return
    const end = pos + node.nodeSize
    if (from <= end && to >= pos) return
    const domain = linkChipDomain(node.text, String(link.attrs.href ?? ''))
    if (domain) {
      decorations.push(Decoration.inline(pos, end, { class: 'link-chip', 'data-domain': domain }))
    }
  })

  return DecorationSet.create(state.doc, decorations)
}

/**
 * Shows bare URLs as compact domain chips.
 * The full URL reappears for editing while the cursor is inside it.
 */
export const linkChipsPlugin = $prose(() => new Plugin({ props: { decorations: chipDecorations } }))
