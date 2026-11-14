import { columnLabel, emptySheetCell, type SheetCell } from '@/lib/sheet/sheetTypes'

/** Value Jspreadsheet stores: a formula keeps its leading `=`. */
export function sheetCellToEditorValue(cell: SheetCell): string {
  return cell.formula ? `=${cell.formula}` : cell.value
}

export function sheetCellsToEditorValues(cells: SheetCell[][]): string[][] {
  return cells.map((row) => row.map(sheetCellToEditorValue))
}

/** Read a Jspreadsheet data cell back into the note's sheet model. */
export function editorValueToSheetCell(raw: unknown): SheetCell {
  if (raw == null) return emptySheetCell()
  const text = typeof raw === 'string' ? raw : String(raw)
  if (!text.startsWith('=')) return { formula: null, value: text }
  const formula = text.slice(1).trim()
  return formula ? { formula, value: '' } : emptySheetCell()
}

export function sheetCellsFromEditorValues(data: unknown[][]): SheetCell[][] {
  if (data.length === 0) return [[emptySheetCell()]]
  return data.map((row) => row.map(editorValueToSheetCell))
}

export type GridCoord = { x: number; y: number }

/** A1 reference for a zero-based grid coordinate. */
export function cellReference(cell: GridCoord): string {
  return `${columnLabel(cell.x)}${cell.y + 1}`
}

/** One cell, or the rectangle between two cells, as an A1 reference. */
export function rangeReference(from: GridCoord, to: GridCoord): string {
  const start = cellReference({ x: Math.min(from.x, to.x), y: Math.min(from.y, to.y) })
  const end = cellReference({ x: Math.max(from.x, to.x), y: Math.max(from.y, to.y) })
  return start === end ? start : `${start}:${end}`
}

const TRAILING_REFERENCE = /(\$?[A-Za-z]+\$?\d+(?::\$?[A-Za-z]+\$?\d+)?)$/
const REFERENCE_PATTERN =
  /(?:^|[^A-Za-z$])\$?([A-Za-z]+)\$?(\d+)(?::\$?([A-Za-z]+)\$?(\d+))?(?![\d(])/g

export type FormulaRange = { x1: number; y1: number; x2: number; y2: number }

function columnIndex(label: string): number {
  let index = 0
  for (const char of label.toUpperCase()) {
    const code = char.charCodeAt(0)
    if (code < 65 || code > 90) return -1
    index = index * 26 + (code - 64)
  }
  return index - 1
}

function withoutQuotedText(formula: string): string {
  return formula.replace(/"(?:[^"]|"")*"/g, (match) => ' '.repeat(match.length))
}

/** Every cell or rectangle a formula mentions, ignoring text inside quotes. */
export function formulaReferenceRanges(formula: string): FormulaRange[] {
  const ranges: FormulaRange[] = []
  for (const match of withoutQuotedText(formula).matchAll(REFERENCE_PATTERN)) {
    const x1 = columnIndex(match[1] ?? '')
    const y1 = Number(match[2]) - 1
    const x2 = match[3] ? columnIndex(match[3]) : x1
    const y2 = match[4] ? Number(match[4]) - 1 : y1
    if (x1 < 0 || x2 < 0 || y1 < 0 || y2 < 0) continue
    ranges.push({
      x1: Math.min(x1, x2),
      y1: Math.min(y1, y2),
      x2: Math.max(x1, x2),
      y2: Math.max(y1, y2),
    })
  }
  return ranges
}

function cursorInsideString(value: string, cursor: number): boolean {
  let quoted = false
  for (let i = 0; i < cursor && i < value.length; i++) {
    if (value[i] === '"') quoted = !quoted
  }
  return quoted
}

/**
 * Insert a cell or range into a formula at the caret.
 * A reference sitting just before the caret is replaced, so a second click
 * or a drag updates that reference instead of appending another one.
 * Returns null when the caret is inside a quoted string.
 */
export function applyFormulaReference(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  reference: string,
): { value: string; cursor: number } | null {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))
  if (cursorInsideString(value, start)) return null
  let from = start
  if (start === end) {
    const match = value.slice(0, start).match(TRAILING_REFERENCE)
    if (match?.[1]) from = start - match[1].length
  }
  return {
    value: value.slice(0, from) + reference + value.slice(end),
    cursor: from + reference.length,
  }
}
