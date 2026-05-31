import { onBeforeUnmount, ref, type Ref } from 'vue'
import * as d3 from 'd3'
import type { DrawingLine, DrawingMode, DrawingSample } from '@/lib/drawing/drawingTypes'
import { coalescedPointerEvents } from '@/lib/drawing/pointerEvents'
import { pathFromSamples, penPressureWithTilt } from '@/lib/drawing/strokePath'

export function useDrawingCanvas(
  canvas: Ref<SVGSVGElement | null>,
  getLines: () => DrawingLine[],
  setLines: (lines: DrawingLine[]) => void,
) {
  const color = ref('#000000')
  const size = ref(1)
  const mode = ref<DrawingMode>('simple')
  const svg = ref<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
  const path = ref<d3.Selection<SVGPathElement, DrawingSample[], null, undefined> | null>(null)
  const points = ref<DrawingSample[]>([])
  const drawing = ref(false)
  const strokeId = ref(crypto.randomUUID())
  const activePointerId = ref<number | null>(null)

  function bindCanvas() {
    if (!canvas.value) return
    svg.value = d3.select(canvas.value)
  }

  function pointerPosition(event: PointerEvent): [number, number] | null {
    if (!canvas.value) return null

    const point = d3.pointer(event, canvas.value)
    return [point[0], point[1]]
  }

  function appendPointerSamples(event: PointerEvent): boolean {
    let added = false

    for (const sample of coalescedPointerEvents(event)) {
      const position = pointerPosition(sample)
      if (!position) continue

      const nextSample: DrawingSample = {
        x: position[0],
        y: position[1],
        pressure: mode.value === 'advanced' ? penPressureWithTilt(sample) : 0.5,
      }

      const last = points.value.at(-1)
      if (
        last &&
        last.x === nextSample.x &&
        last.y === nextSample.y &&
        last.pressure === nextSample.pressure
      ) {
        continue
      }

      points.value.push(nextSample)
      added = true
    }

    return added
  }

  function commitStroke(strokePoints: DrawingSample[], complete = false) {
    if (strokePoints.length === 0) return

    const nextPath = pathFromSamples(strokePoints, mode.value, size.value, complete)
    const lines = getLines().filter((item) => item.id !== strokeId.value)

    setLines([
      ...lines,
      {
        id: strokeId.value,
        color: color.value,
        size: size.value,
        path: nextPath,
        mode: mode.value,
      },
    ])
  }

  function configurePreviewPath(
    preview: d3.Selection<SVGPathElement, DrawingSample[], null, undefined>,
  ) {
    preview.attr('id', `id-${strokeId.value}`).attr('pointer-events', 'none')

    if (mode.value === 'advanced') {
      preview.attr('fill', color.value).attr('stroke', 'none')
      return
    }

    preview
      .attr('stroke', color.value)
      .attr('stroke-width', size.value)
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
  }

  function onStartDrawing(event: PointerEvent) {
    if (!canvas.value || event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    if (!svg.value) bindCanvas()
    if (!svg.value) return

    activePointerId.value = event.pointerId
    canvas.value.setPointerCapture(event.pointerId)

    drawing.value = true
    points.value = []
    path.value = svg.value.append('path').datum(points.value)
    configurePreviewPath(path.value)

    appendPointerSamples(event)
    if (points.value.length > 0) tick()
  }

  function onMove(event: PointerEvent) {
    if (!drawing.value || activePointerId.value !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()

    if (!appendPointerSamples(event)) return

    tick()
  }

  function onEndDrawing(event: PointerEvent) {
    if (activePointerId.value !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()

    canvas.value?.releasePointerCapture(event.pointerId)
    activePointerId.value = null

    if (!drawing.value) return

    appendPointerSamples(event)
    commitStroke(points.value, true)
    drawing.value = false
    svg.value?.select(`#id-${strokeId.value}`).remove()
    strokeId.value = crypto.randomUUID()
    path.value = null
    points.value = []
  }

  function tick() {
    if (!path.value) return

    requestAnimationFrame(() => {
      path.value?.attr('d', (strokePoints) => {
        commitStroke(strokePoints, false)
        return pathFromSamples(strokePoints, mode.value, size.value, false)
      })
    })
  }

  function clear() {
    setLines([])
  }

  onBeforeUnmount(() => {
    if (canvas.value && activePointerId.value !== null) {
      canvas.value.releasePointerCapture(activePointerId.value)
    }
  })

  return {
    color,
    size,
    mode,
    strokeId,
    drawing,
    bindCanvas,
    onStartDrawing,
    onMove,
    onEndDrawing,
    clear,
  }
}
