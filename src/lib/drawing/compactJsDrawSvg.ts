/** Decimal places for js-draw SVG coordinates at normal display zoom. */
export const JS_DRAW_SVG_COORD_DECIMALS = 1

export function formatSvgNumber(value: number, decimals: number): string {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  if (decimals === 0 || Number.isInteger(rounded)) {
    return String(Math.trunc(rounded))
  }

  return rounded
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

export function roundNumbersInSvgValue(value: string, decimals: number): string {
  return value.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, (match) => {
    const number = Number(match)
    if (!Number.isFinite(number)) return match
    return formatSvgNumber(number, decimals)
  })
}

const ROUNDED_ATTRS = new Set([
  'd',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'stroke-width',
  'transform',
  'points',
  'font-size',
  'dx',
  'dy',
])

function compactSvgElement(element: Element, decimals: number): void {
  for (const { name, value } of [...element.attributes]) {
    if (name === 'data-highp-transform') {
      element.removeAttribute(name)
      continue
    }

    if (ROUNDED_ATTRS.has(name)) {
      element.setAttribute(name, roundNumbersInSvgValue(value, decimals))
    }
  }

  if (element instanceof SVGElement && element.style.transform) {
    element.style.transform = roundNumbersInSvgValue(element.style.transform, decimals)
  }

  for (const child of element.children) {
    compactSvgElement(child, decimals)
  }
}

export function compactJsDrawSvgMarkup(
  svgMarkup: string,
  decimals = JS_DRAW_SVG_COORD_DECIMALS,
): string {
  const trimmed = svgMarkup.trim()
  if (!trimmed) return trimmed

  const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
  const svg = doc.documentElement
  if (svg.tagName !== 'svg') return trimmed

  compactSvgElement(svg, decimals)
  return svg.outerHTML
}
