import FormulaParser, { FormulaError, MAX_COLUMN, MAX_ROW } from '@rowsncolumns/fast-formula-parser'

import type { SheetCell } from '@/lib/sheet/sheetTypes'

export type SheetDisplayGrid = string[][]

type CellValue = string | number | boolean | Date | FormulaError | null | undefined

function cellAt(cells: SheetCell[][], row: number, col: number): SheetCell | undefined {
  return cells[row - 1]?.[col - 1]
}

function parseLiteral(value: string): string | number | boolean | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true'
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return Number(trimmed)
  return value
}

function isFormulaError(value: unknown): value is FormulaError {
  return value instanceof FormulaError
}

function isCellValue(value: unknown): value is CellValue {
  return (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date ||
    isFormulaError(value)
  )
}

export function formatSheetValue(value: unknown): string {
  if (value == null) return ''
  if (isFormulaError(value)) return value.error
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const error = (value as { error?: unknown }).error
    if (typeof error === 'string' && error.startsWith('#')) return error
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '#NUM!'
    return String(value)
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return formatSheetValue(value[0]?.[0])
  return String(value)
}

export function evaluateSheet(cells: SheetCell[][]): SheetDisplayGrid {
  const height = cells.length
  const width = Math.max(0, ...cells.map((row) => row.length))
  const visiting = new Set<string>()
  const cache = new Map<string, CellValue>()

  const parser = new FormulaParser({
    onCell: ({ row, col }) => valueAt(row, col),
    onRange: (ref) => {
      const fromRow = ref.from.row
      const fromCol = ref.from.col
      const toRow = ref.to.row >= MAX_ROW ? height : Math.min(ref.to.row, height)
      const toCol = ref.to.col >= MAX_COLUMN ? width : Math.min(ref.to.col, width)
      const rows: CellValue[][] = []
      for (let row = fromRow; row <= toRow; row++) {
        const next: CellValue[] = []
        for (let col = fromCol; col <= toCol; col++) next.push(valueAt(row, col))
        rows.push(next)
      }
      return rows
    },
  })

  function valueAt(row: number, col: number): CellValue {
    const key = `${row}:${col}`
    if (cache.has(key)) return cache.get(key) ?? null
    if (visiting.has(key)) {
      const cycle = new FormulaError('#CYCLE!')
      cache.set(key, cycle)
      return cycle
    }

    const cell = cellAt(cells, row, col)
    if (!cell) {
      cache.set(key, null)
      return null
    }

    if (!cell.formula) {
      const literal = parseLiteral(cell.value)
      cache.set(key, literal)
      return literal
    }

    visiting.add(key)
    try {
      const result = parser.parse(cell.formula, { row, col, sheet: 'Sheet1' })
      const value = Array.isArray(result) ? result[0]?.[0] : result
      const cellValue = isCellValue(value) ? value : formatSheetValue(value)
      cache.set(key, cellValue)
      return cellValue
    } catch (error) {
      const formatted = isFormulaError(error) ? error : new FormulaError('#VALUE!', String(error))
      cache.set(key, formatted)
      return formatted
    } finally {
      visiting.delete(key)
    }
  }

  return Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => formatSheetValue(valueAt(r + 1, c + 1))),
  )
}

export function bakeSheetResults(cells: SheetCell[][]): SheetCell[][] {
  const display = evaluateSheet(cells)
  return cells.map((row, r) =>
    row.map((cell, c) =>
      cell.formula ? { formula: cell.formula, value: display[r]?.[c] ?? '' } : { ...cell },
    ),
  )
}
