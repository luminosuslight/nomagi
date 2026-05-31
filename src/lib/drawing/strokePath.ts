import { getStroke } from 'perfect-freehand'
import type { DrawingMode, DrawingSample } from '@/lib/drawing/drawingTypes'

const ADVANCED_STROKE_OPTIONS = {
  thinning: 0.5,
  smoothing: 0,
  streamline: 0,
  simulatePressure: false,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
} as const

export function penPressure(event: PointerEvent): number {
  if (event.pointerType === 'pen' && event.pressure > 0) {
    return event.pressure
  }
  return 0.5
}

export function penPressureWithTilt(event: PointerEvent): number {
  const pressure = penPressure(event)
  if (event.pointerType !== 'pen') return pressure

  const altitude = event.altitudeAngle ?? Math.PI / 2
  const tiltFactor = Math.sin(altitude)
  return pressure * (0.4 + 0.6 * tiltFactor)
}

export function polylinePathFromSamples(
  samples: Pick<DrawingSample, 'x' | 'y'>[],
  size = 1,
): string {
  if (samples.length === 0) return ''
  if (samples.length === 1) {
    const { x, y } = samples[0]
    const radius = Math.max(size / 2, 0.5)
    return `M ${x - radius} ${y} L ${x + radius} ${y}`
  }

  const [first, ...rest] = samples
  return `M ${first.x} ${first.y}${rest.map((point) => ` L ${point.x} ${point.y}`).join('')}`
}

function dotPath(x: number, y: number, radius: number): string {
  return `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y} Z`
}

function getSvgPathFromStroke(points: number[][]): string {
  if (points.length < 4) return ''

  const average = (a: number, b: number) => (a + b) / 2

  let a = points[0]
  let b = points[1]
  const c = points[2]

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`

  for (let index = 2, max = points.length - 1; index < max; index += 1) {
    a = points[index]
    b = points[index + 1]
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
  }

  return `${result}Z`
}

export function advancedPathFromSamples(
  samples: DrawingSample[],
  size: number,
  complete: boolean,
): string {
  if (samples.length === 0) return ''

  const input = samples.map(
    (sample) => [sample.x, sample.y, sample.pressure] as [number, number, number],
  )
  const outline = getStroke(input, {
    ...ADVANCED_STROKE_OPTIONS,
    size,
    last: complete,
  })
  const path = getSvgPathFromStroke(outline)
  if (path) return path

  const { x, y } = samples[0]
  return dotPath(x, y, size / 2)
}

export function pathFromSamples(
  samples: DrawingSample[],
  mode: DrawingMode,
  size: number,
  complete: boolean,
): string {
  if (mode === 'advanced') {
    return advancedPathFromSamples(samples, size, complete)
  }

  return polylinePathFromSamples(samples, size)
}
