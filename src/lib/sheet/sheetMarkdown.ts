import { emptySheetCell, SHEET_COMMENT, type SheetCell } from '@/lib/sheet/sheetTypes'

export function isSheetComment(value: string): boolean {
  return /^\s*<!--\s*sheet\s*-->\s*$/i.test(value)
}

export function isFormulaExpression(expr: string): boolean {
  const s = expr.trim()
  if (!s) return false
  if (s.startsWith('=')) return isFormulaExpression(s.slice(1))
  if (/^[A-Za-z]+\$?\d+/.test(s)) return true
  if (/^[A-Za-z]+\s*\(/.test(s)) return true
  if (/[\d.]/.test(s) && /[+\-*/^()]/.test(s)) return true
  return false
}

export function formulaFromHref(href: string): string | null {
  let dest = href.trim()
  try {
    dest = decodeURIComponent(dest)
  } catch {
    /* keep dest */
  }
  if (dest.startsWith('<') && dest.endsWith('>')) dest = dest.slice(1, -1).trim()
  if (!dest.startsWith('#')) return null
  let expr = dest.slice(1).trim()
  if (expr.startsWith('=')) expr = expr.slice(1).trim()
  if (!isFormulaExpression(expr)) return null
  return expr
}

export function sheetHasFormula(cells: SheetCell[][]): boolean {
  return cells.some((row) => row.some((cell) => cell.formula != null))
}

function unescapeTableText(text: string): string {
  return text.replace(/\\([\\|])/g, '$1')
}

function escapePipes(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

function escapeLinkText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

function escapeAngleDest(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/</g, '\\<').replace(/>/g, '\\>')
}

function unescapeAngleDest(text: string): string {
  return text.replace(/\\([\\<>])/g, '$1')
}

function unescapeLinkText(text: string): string {
  return text.replace(/\\([\\[\]])/g, '$1')
}

function splitTableRow(line: string): string[] {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|')) body = body.slice(0, -1)

  const cells: string[] = []
  let current = ''
  let escaped = false
  for (const ch of body) {
    if (escaped) {
      current += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      current += ch
      escaped = true
      continue
    }
    if (ch === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function isAlignmentRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, '')))
}

function parseFormulaLink(raw: string): { formula: string; result: string } | null {
  const text = raw.trim()
  if (!text.startsWith('[')) return null

  let i = 1
  let label = ''
  let escaped = false
  for (; i < text.length; i++) {
    const ch = text[i]
    if (escaped) {
      label += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      label += ch
      escaped = true
      continue
    }
    if (ch === ']') break
    label += ch
  }
  if (i >= text.length || text[i] !== ']') return null
  i += 1
  if (text[i] !== '(') return null
  i += 1

  let dest = ''
  if (text[i] === '<') {
    i += 1
    escaped = false
    for (; i < text.length; i++) {
      const ch = text[i]
      if (escaped) {
        dest += ch
        escaped = false
        continue
      }
      if (ch === '\\') {
        dest += ch
        escaped = true
        continue
      }
      if (ch === '>') break
      dest += ch
    }
    if (text[i] !== '>') return null
    i += 1
    dest = unescapeAngleDest(dest)
  } else {
    let depth = 0
    for (; i < text.length; i++) {
      const ch = text[i]
      if (ch === '(') depth += 1
      else if (ch === ')') {
        if (depth === 0) break
        depth -= 1
      }
      dest += ch
    }
  }

  if (text[i] !== ')') return null
  if (text.slice(i + 1).trim() !== '') return null

  const formula = formulaFromHref(dest.startsWith('#') ? dest : `#${dest}`)
  if (!formula) return null
  return { formula, result: unescapeLinkText(label) }
}

export function parseSheetCell(raw: string): SheetCell {
  const link = parseFormulaLink(raw)
  if (link) return { formula: link.formula, value: link.result }
  return { formula: null, value: unescapeTableText(raw) }
}

export function serializeSheetCell(cell: SheetCell): string {
  if (cell.formula) {
    const dest = escapeAngleDest(`#${cell.formula}`)
    return `[${escapeLinkText(cell.value)}](<${dest}>)`
  }
  return escapePipes(cell.value)
}

export function normalizeSheet(cells: SheetCell[][]): SheetCell[][] {
  const width = Math.max(1, ...cells.map((row) => row.length))
  const height = Math.max(1, cells.length)
  return Array.from({ length: height }, (_, r) => {
    const row = cells[r] ?? []
    return Array.from({ length: width }, (_, c) =>
      row[c] ? { formula: row[c].formula, value: row[c].value } : emptySheetCell(),
    )
  })
}

export function trimSheet(cells: SheetCell[][]): SheetCell[][] {
  const grid = normalizeSheet(cells)
  while (grid.length > 2 && grid[grid.length - 1].every(isEmpty)) grid.pop()
  while (grid[0].length > 1 && grid.every((row) => isEmpty(row[row.length - 1]))) {
    for (const row of grid) row.pop()
  }
  return grid
}

function isEmpty(cell: SheetCell): boolean {
  return !cell.formula && cell.value.trim() === ''
}

export function parseSheetMarkdown(markdown: string): SheetCell[][] | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((line) => line.trim() !== '' && !isSheetComment(line))
  if (start === -1) return null

  const tableLines = lines.slice(start).filter((line) => line.trim() !== '')
  if (tableLines.length < 2) return null

  const header = splitTableRow(tableLines[0])
  const delimiter = splitTableRow(tableLines[1])
  if (!isAlignmentRow(delimiter)) return null

  const width = Math.max(header.length, delimiter.length)
  const rows: string[][] = [padRow(header, width)]
  for (const line of tableLines.slice(2)) {
    if (!line.includes('|')) return null
    rows.push(padRow(splitTableRow(line), width))
  }
  if (rows.length === 1) rows.push(Array.from({ length: width }, () => ''))

  return rows.map((row) => row.map((cell) => parseSheetCell(cell)))
}

function padRow(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, i) => row[i] ?? '')
}

export function serializeSheetMarkdown(cells: SheetCell[][]): string {
  const grid = trimSheet(cells)
  const width = grid[0].length
  const header = `| ${grid[0].map(serializeSheetCell).join(' | ')} |`
  const delimiter = `| ${Array.from({ length: width }, () => '---').join(' | ')} |`
  const body = grid.slice(1).map((row) => `| ${row.map(serializeSheetCell).join(' | ')} |`)
  return [SHEET_COMMENT, header, delimiter, ...body].join('\n')
}

export function mdastText(node: { type?: string; value?: string; children?: unknown[] }): string {
  if (node.type === 'text' || node.type === 'html') return node.value ?? ''
  const children = node.children ?? []
  return children
    .map((child) => mdastText(child as { type?: string; value?: string; children?: unknown[] }))
    .join('')
}

export function sheetCellFromMdast(cell: {
  children?: unknown[]
  type?: string
  url?: string
  value?: string
}): SheetCell {
  const children = (cell.children ?? []) as Array<{
    type?: string
    url?: string
    value?: string
    children?: unknown[]
  }>
  if (children.length === 1 && children[0].type === 'link') {
    const formula = formulaFromHref(String(children[0].url ?? ''))
    if (formula) return { formula, value: mdastText(children[0]) }
  }
  return parseSheetCell(mdastText(cell))
}

export function sheetFromMdastTable(table: { children?: unknown[] }): SheetCell[][] {
  const rows = (table.children ?? []) as Array<{ children?: unknown[] }>
  const grid = rows.map((row) => {
    const cells = (row.children ?? []) as Array<{ children?: unknown[] }>
    return cells.map((cell) => sheetCellFromMdast(cell))
  })
  return normalizeSheet(grid.length > 0 ? grid : [[emptySheetCell()]])
}
