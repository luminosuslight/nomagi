import { linesFromSvg, svgMarkupFromLines, type DrawingLine } from '@/lib/drawing/drawingTypes'

export function isDrawingFigureHtml(html: string): boolean {
  return html.includes('data-type="drawing"')
}

export function linesFromFigureHtml(html: string): DrawingLine[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const figure = doc.querySelector('figure[data-type="drawing"]')
  if (figure) return linesFromSvg(figure.querySelector('svg'))

  return linesFromSvg(doc.querySelector('svg'))
}

export function figureHtmlFromLines(lines: DrawingLine[]): string {
  return `<figure data-type="drawing" class="sketch">\n${svgMarkupFromLines(lines)}\n</figure>`
}

export function drawingMarkdownFromLines(lines: DrawingLine[]): string {
  return `\n\n${figureHtmlFromLines(lines)}\n\n`
}
