export interface DrawingLine {
  id: string
  color: string
  size: number
  path: string
}

export const DRAWING_VIEWBOX = '0 0 500 250'

export function linesFromSvg(svg: Element | null): DrawingLine[] {
  if (!svg) return []

  return [...svg.querySelectorAll('path')].map((path) => ({
    id: path.id.replace(/^id-/, '') || crypto.randomUUID(),
    color: path.getAttribute('stroke') ?? '#000000',
    size: Number(path.getAttribute('stroke-width') ?? 2),
    path: path.getAttribute('d') ?? '',
  }))
}

export function svgMarkupFromLines(lines: DrawingLine[]): string {
  const paths = lines
    .map(
      (line) =>
        `<path id="id-${line.id}" d="${line.path}" stroke="${line.color}" stroke-width="${line.size}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`,
    )
    .join('')

  return `<svg viewBox="${DRAWING_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`
}
