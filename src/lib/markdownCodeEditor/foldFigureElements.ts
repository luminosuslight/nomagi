import { ensureSyntaxTree, foldEffect, foldable, forceParsing } from '@codemirror/language'
import type { StateEffect } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

type FoldRange = { from: number; to: number }

const FIGURE_OPEN_RE = /<figure\b/gi
const MAX_FOLD_ATTEMPTS = 8

function countFigureTags(doc: string): number {
  let count = 0
  const re = new RegExp(FIGURE_OPEN_RE.source, FIGURE_OPEN_RE.flags)
  while (re.exec(doc)) count += 1
  return count
}

function figureOpenIndices(doc: string): number[] {
  const indices: number[] = []
  const re = new RegExp(FIGURE_OPEN_RE.source, FIGURE_OPEN_RE.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(doc))) indices.push(match.index)
  return indices
}

function foldRangeForFigureAt(state: EditorView['state'], absFrom: number): FoldRange | null {
  const line = state.doc.lineAt(absFrom)
  return foldable(state, line.from, line.to)
}

/** @returns How many figure blocks were folded this pass. */
export function foldFigureElements(view: EditorView): number {
  const { state } = view
  forceParsing(view, state.doc.length, 5000)
  if (!ensureSyntaxTree(state, state.doc.length, 5000)) return 0

  const effects: StateEffect<FoldRange>[] = []
  const seenRanges = new Set<string>()

  for (const absFrom of figureOpenIndices(state.doc.toString())) {
    const range = foldRangeForFigureAt(state, absFrom)
    if (!range) continue

    const key = `${range.from}:${range.to}`
    if (seenRanges.has(key)) continue
    seenRanges.add(key)
    effects.push(foldEffect.of(range))
  }

  if (effects.length) view.dispatch({ effects })
  return effects.length
}

/** Fold figures once the markdown/HTML syntax tree is ready. Retries while parsing catches up. */
export function scheduleFoldFigureElements(view: EditorView, attempt = 0) {
  requestAnimationFrame(() => {
    if (!view.dom.isConnected) return

    const expected = countFigureTags(view.state.doc.toString())
    const folded = foldFigureElements(view)

    if (folded < expected && attempt + 1 < MAX_FOLD_ATTEMPTS) {
      scheduleFoldFigureElements(view, attempt + 1)
    }
  })
}
