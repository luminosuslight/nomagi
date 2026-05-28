export function isJsDrawFigureHtml(html: string): boolean {
  return html.includes('data-type="js-draw"')
}

export function svgMarkupFromFigureHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const figure = doc.querySelector('figure[data-type="js-draw"]')
  const svg = figure?.querySelector('svg') ?? doc.querySelector('svg')
  return svg?.outerHTML ?? ''
}

export function figureHtmlFromSvgMarkup(svgMarkup: string): string {
  const svg = svgMarkup.trim()
  if (!svg) {
    return `<figure data-type="js-draw" class="js-draw-sketch">\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250"></svg>\n</figure>`
  }

  return `<figure data-type="js-draw" class="js-draw-sketch">\n${svg}\n</figure>`
}
