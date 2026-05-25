import { onBeforeUnmount, ref, type Ref } from 'vue'
import * as d3 from 'd3'
import type { DrawingLine } from '@/lib/drawing/drawingTypes'
import { coalescedPointerEvents } from '@/lib/drawing/pointerEvents'

export function useDrawingCanvas(
  canvas: Ref<SVGSVGElement | null>,
  getLines: () => DrawingLine[],
  setLines: (lines: DrawingLine[]) => void,
) {
  const color = ref('#000000')
  const size = ref(1)
  const svg = ref<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
  const path = ref<d3.Selection<SVGPathElement, [number, number][], null, undefined> | null>(null)
  const points = ref<[number, number][]>([])
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

      const last = points.value.at(-1)
      if (last && last[0] === position[0] && last[1] === position[1]) continue

      points.value.push(position)
      added = true
    }

    return added
  }

  function commitStroke(strokePoints: [number, number][]) {
    if (strokePoints.length === 0) return

    const nextPath = d3.line().curve(d3.curveBasis)(strokePoints) ?? ''
    const lines = getLines().filter((item) => item.id !== strokeId.value)

    setLines([
      ...lines,
      {
        id: strokeId.value,
        color: color.value,
        size: size.value,
        path: nextPath,
      },
    ])
  }

  function onStartDrawing(event: PointerEvent) {
    if (!svg.value || !canvas.value || event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    activePointerId.value = event.pointerId
    canvas.value.setPointerCapture(event.pointerId)

    drawing.value = true
    points.value = []
    path.value = svg.value
      .append('path')
      .datum(points.value)
      .attr('id', `id-${strokeId.value}`)
      .attr('stroke', color.value)
      .attr('stroke-width', size.value)
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('pointer-events', 'none')

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
    commitStroke(points.value)
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
        commitStroke(strokePoints)
        return d3.line().curve(d3.curveBasis)(strokePoints) ?? ''
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
    strokeId,
    bindCanvas,
    onStartDrawing,
    onMove,
    onEndDrawing,
    clear,
  }
}
