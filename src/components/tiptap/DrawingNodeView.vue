<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import * as d3 from 'd3'
import type { DrawingLine } from '@/lib/tiptap/drawingTypes'

const props = defineProps(nodeViewProps)

const COLORS = ['#A975FF', '#FB5151', '#FD9170', '#FFCB6B', '#68CEF8', '#80CBC4', '#9DEF8F']

const color = ref(COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#000000')
const size = ref(Math.max(1, Math.ceil(Math.random() * 10)))
const canvas = ref<SVGSVGElement | null>(null)
const svg = ref<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
const path = ref<d3.Selection<SVGPathElement, [number, number][], null, undefined> | null>(null)
const points = ref<[number, number][]>([])
const drawing = ref(false)
const id = ref(crypto.randomUUID())
const activePointerId = ref<number | null>(null)

function pointerPosition(event: PointerEvent): [number, number] | null {
  if (!canvas.value) return null

  const rect = canvas.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 500
  const y = ((event.clientY - rect.top) / rect.height) * 250

  return [x, y]
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
    .attr('id', `id-${id.value}`)
    .attr('stroke', color.value)
    .attr('stroke-width', size.value)
    .attr('fill', 'none')
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('pointer-events', 'none')
}

function onMove(event: PointerEvent) {
  if (!drawing.value || activePointerId.value !== event.pointerId) return

  event.preventDefault()
  event.stopPropagation()

  const position = pointerPosition(event)
  if (!position) return

  points.value.push(position)
  tick()
}

function commitStroke(strokePoints: [number, number][]) {
  if (strokePoints.length === 0) return

  const nextPath = d3.line().curve(d3.curveBasis)(strokePoints) ?? ''
  const lines = (props.node.attrs.lines as DrawingLine[]).filter((item) => item.id !== id.value)

  props.updateAttributes({
    lines: [
      ...lines,
      {
        id: id.value,
        color: color.value,
        size: size.value,
        path: nextPath,
      },
    ],
  })
}

function onEndDrawing(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return

  event.preventDefault()
  event.stopPropagation()

  canvas.value?.releasePointerCapture(event.pointerId)
  activePointerId.value = null

  if (!drawing.value) return

  commitStroke(points.value)
  drawing.value = false
  svg.value?.select(`#id-${id.value}`).remove()
  id.value = crypto.randomUUID()
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
  props.updateAttributes({ lines: [] })
}

onMounted(() => {
  if (!canvas.value) return

  svg.value = d3.select(canvas.value)
})

onBeforeUnmount(() => {
  if (canvas.value && activePointerId.value !== null) {
    canvas.value.releasePointerCapture(activePointerId.value)
  }
})
</script>

<template>
  <NodeViewWrapper
    class="draw my-4"
    contenteditable="false"
  >
    <div
      class="rounded-md border bg-background p-2"
      contenteditable="false"
    >
      <div
        class="mb-2 flex items-center gap-2"
        data-drawing-controls
        contenteditable="false"
      >
        <input
          v-model="color"
          type="color"
          class="h-9 w-9 cursor-pointer rounded border bg-transparent p-0.5"
          aria-label="Stroke color"
        />
        <input
          v-model.number="size"
          type="number"
          min="1"
          max="10"
          class="h-9 w-16 rounded-md border bg-background px-2 text-base"
          aria-label="Stroke width"
        />
        <button
          type="button"
          class="rounded-md border px-3 py-1.5 text-base hover:bg-muted"
          @click="clear"
        >
          Clear
        </button>
      </div>
      <svg
        ref="canvas"
        viewBox="0 0 500 250"
        class="w-full touch-none rounded bg-muted/40"
        data-drawing-canvas
        contenteditable="false"
        @pointerdown="onStartDrawing"
        @pointermove="onMove"
        @pointerup="onEndDrawing"
        @pointercancel="onEndDrawing"
      >
        <rect
          width="500"
          height="250"
          fill="transparent"
          pointer-events="all"
        />
        <template
          v-for="item in (node.attrs.lines as DrawingLine[])"
          :key="item.id"
        >
          <path
            v-if="item.id !== id"
            :id="`id-${item.id}`"
            :d="item.path"
            :stroke="item.color"
            :stroke-width="item.size"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            pointer-events="none"
          />
        </template>
      </svg>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.draw svg {
  cursor: crosshair;
}
</style>
