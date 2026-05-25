export type DrawingMode = 'simple' | 'advanced'

export interface DrawingSample {
  x: number
  y: number
  pressure: number
}

export interface DrawingLine {
  id: string
  color: string
  size: number
  path: string
  mode?: DrawingMode
}

export const DRAWING_VIEWBOX = '0 0 500 250'

function lineModeFromPath(path: Element): DrawingMode {
  const dataMode = path.getAttribute('data-mode')
  if (dataMode === 'advanced') return 'advanced'

  const fill = path.getAttribute('fill')
  const stroke = path.getAttribute('stroke')
  if (fill && fill !== 'none' && (!stroke || stroke === 'none')) {
    return 'advanced'
  }

  return 'simple'
}

export function pathAttributesForLine(line: DrawingLine): Record<string, string> {
  const mode = line.mode ?? 'simple'

  if (mode === 'advanced') {
    return {
      id: `id-${line.id}`,
      d: line.path,
      fill: line.color,
      stroke: 'none',
      'data-mode': 'advanced',
      'data-size': String(line.size),
    }
  }

  return {
    id: `id-${line.id}`,
    d: line.path,
    stroke: line.color,
    'stroke-width': String(line.size),
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }
}

export function linesFromSvg(svg: Element | null): DrawingLine[] {
  if (!svg) return []

  return [...svg.querySelectorAll('path')].map((path) => {
    const mode = lineModeFromPath(path)
    const size = Number(path.getAttribute('data-size') ?? path.getAttribute('stroke-width') ?? 2)

    return {
      id: path.id.replace(/^id-/, '') || crypto.randomUUID(),
      color:
        (mode === 'advanced'
          ? path.getAttribute('fill')
          : path.getAttribute('stroke')) ?? '#000000',
      size,
      path: path.getAttribute('d') ?? '',
      mode,
    }
  })
}

export function svgMarkupFromLines(lines: DrawingLine[]): string {
  const paths = lines
    .map((line) => {
      const attrs = pathAttributesForLine(line)
      const serialized = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ')

      return `<path ${serialized} />`
    })
    .join('')

  return `<svg viewBox="${DRAWING_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`
}
