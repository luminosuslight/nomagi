<script setup lang="ts">
/* Parent passes a Ref via drawingEditing; updating .value is intentional. */
/* eslint-disable vue/no-mutating-props */
import { computed, isRef, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import DrawingPaths from '@/components/drawing/DrawingPaths.vue'
import Button from '@/components/ui/Button.vue'
import { ColorPicker } from '@/components/ui/color-picker'
import Label from '@/components/ui/Label.vue'
import { Slider } from '@/components/ui/slider'
import { useDrawingCanvas } from '@/composables/useDrawingCanvas'
import type { DrawingLine } from '@/lib/drawing/drawingTypes'

const props = defineProps<{
  lines: DrawingLine[] | Ref<DrawingLine[]>
  editable: boolean | Ref<boolean>
  overlayRoot?: HTMLElement | null | Ref<HTMLElement | null | null>
  drawingEditing?: Ref<boolean> | null
  onUpdateLines: (lines: DrawingLine[]) => void
}>()

const editing = ref(false)
const editCanvas = ref<SVGSVGElement | null>(null)
const drawingOverlay = ref<HTMLElement | null>(null)

const linesValue = computed(() => (isRef(props.lines) ? props.lines.value : props.lines))

const editableValue = computed(() =>
  isRef(props.editable) ? props.editable.value : props.editable,
)

const overlayTarget = computed(() => {
  const value = props.overlayRoot
  if (value == null) return undefined
  return isRef(value) ? (value.value ?? undefined) : value
})

const getLines = () => linesValue.value

function setLines(nextLines: DrawingLine[]) {
  props.onUpdateLines(nextLines)
}

const { color, size, mode, strokeId, bindCanvas, onStartDrawing, onMove, onEndDrawing, clear } =
  useDrawingCanvas(editCanvas, getLines, setLines)

const sizeModel = computed({
  get: () => [size.value],
  set: (value) => {
    size.value = value?.[0] ?? 1
  },
})

function startEditing(event: MouseEvent) {
  event.preventDefault()
  editing.value = true
}

function stopEditing() {
  editing.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    stopEditing()
  }
}

watch(editing, async (isEditing) => {
  if (props.drawingEditing) {
    props.drawingEditing.value = isEditing
  }

  if (isEditing) {
    await nextTick()
    drawingOverlay.value?.focus({ preventScroll: true })
    requestAnimationFrame(() => bindCanvas())
    window.addEventListener('keydown', onKeydown)
    return
  }

  window.removeEventListener('keydown', onKeydown)
})

onMounted(() => {
  if (editing.value) bindCanvas()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (props.drawingEditing) {
    props.drawingEditing.value = false
  }
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-md border border-border/60 bg-background"
    contenteditable="false"
  >
    <Button
      v-if="editableValue"
      type="button"
      variant="outline"
      size="sm"
      class="absolute left-2 top-2 z-10 gap-1.5 bg-background/90 text-base shadow-sm backdrop-blur-sm"
      data-drawing-edit
      contenteditable="false"
      @click.stop="startEditing"
    >
      <Pencil class="size-4" />
      Edit
    </Button>
    <div class="aspect-[2/1] w-full">
      <svg
        viewBox="0 0 500 250"
        class="block h-full w-full"
        aria-hidden="true"
      >
        <DrawingPaths :lines="linesValue" />
      </svg>
    </div>
  </div>

  <Teleport
    v-if="editing"
    :to="overlayTarget"
  >
    <div
      ref="drawingOverlay"
      tabindex="-1"
      class="absolute inset-0 z-50 flex min-h-0 touch-none flex-col overscroll-contain bg-background outline-none"
      data-drawing-editor
      contenteditable="false"
    >
      <div
        class="flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
        data-drawing-controls
        contenteditable="false"
      >
        <div class="flex items-center gap-3">
          <ColorPicker v-model="color" />
          <div
            class="flex shrink-0 items-center gap-1 rounded-md border border-input p-1"
            role="group"
            aria-label="Drawing mode"
          >
            <Button
              type="button"
              size="sm"
              :variant="mode === 'simple' ? 'default' : 'outline'"
              class="text-base"
              @click="mode = 'simple'"
            >
              Basic
            </Button>
            <Button
              type="button"
              size="sm"
              :variant="mode === 'advanced' ? 'default' : 'outline'"
              class="text-base"
              @click="mode = 'advanced'"
            >
              Pen
            </Button>
          </div>
        </div>
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <Label class="shrink-0 text-base text-muted-foreground">Width</Label>
          <Slider
            v-model="sizeModel"
            :min="1"
            :max="10"
            :step="1"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex items-center justify-end gap-3 sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-base"
            @click="clear"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            class="text-base"
            @click="stopEditing"
          >
            Done
          </Button>
        </div>
      </div>

      <div class="min-h-0 flex-1 bg-muted/20 p-4">
        <svg
          ref="editCanvas"
          viewBox="0 0 500 250"
          class="mx-auto h-full max-h-full w-full max-w-5xl touch-none cursor-crosshair rounded-md border border-border/60 bg-background"
          data-drawing-canvas
          contenteditable="false"
          @pointerdown="onStartDrawing"
          @pointermove="onMove"
          @pointerup="onEndDrawing"
          @pointercancel="onEndDrawing"
        >
          <DrawingPaths
            :lines="linesValue"
            :exclude-id="strokeId"
            interactive
          />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Crepe reset.css zeros button styles inside .milkdown; restore shadcn outline button look. */
.milkdown .milkdown-drawing-block button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--input);
  background-color: color-mix(in oklch, var(--background) 90%, transparent);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  backdrop-filter: blur(4px);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1;
  color: var(--foreground);
  cursor: pointer;
  transition:
    color 150ms,
    background-color 150ms;
}

.milkdown .milkdown-drawing-block button:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
</style>
