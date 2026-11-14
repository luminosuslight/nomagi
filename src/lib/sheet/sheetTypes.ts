export type SheetCell = {
  /** Excel formula without a leading `=` or `#`. Null for a plain value. */
  formula: string | null
  /** Plain value, or the last computed result for a formula cell. */
  value: string
}

export const SHEET_COMMENT = '<!-- sheet -->'

export function emptySheetCell(): SheetCell {
  return { formula: null, value: '' }
}

export function emptySheet(rows = 4, cols = 3): SheetCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => emptySheetCell()))
}

export function cloneSheet(cells: SheetCell[][]): SheetCell[][] {
  return cells.map((row) => row.map((cell) => ({ ...cell })))
}

export function isSheetCellEmpty(cell: SheetCell): boolean {
  return !cell.formula && cell.value.trim() === ''
}

export function columnLabel(index0: number): string {
  let n = index0 + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

export function padSheet(cells: SheetCell[][], minRows: number, minCols: number): SheetCell[][] {
  const width = Math.max(minCols, ...cells.map((row) => row.length), 1)
  const height = Math.max(minRows, cells.length, 1)
  return Array.from({ length: height }, (_, r) => {
    const row = cells[r] ?? []
    return Array.from({ length: width }, (_, c) =>
      row[c] ? { formula: row[c].formula, value: row[c].value } : emptySheetCell(),
    )
  })
}
