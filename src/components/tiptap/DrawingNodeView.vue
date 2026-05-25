<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import DrawingPaths from '@/components/tiptap/DrawingPaths.vue'
import Button from '@/components/ui/Button.vue'
import { ColorPicker } from '@/components/ui/color-picker'
import Label from '@/components/ui/Label.vue'
import { Slider } from '@/components/ui/slider'
import { useDrawingCanvas } from '@/composables/useDrawingCanvas'
import { tiptapEditorOverlayRootKey } from '@/lib/tiptap/editorOverlay'
import type { DrawingLine } from '@/lib/tiptap/drawingTypes'

const props = defineProps(nodeViewProps)

const overlayRoot = inject(tiptapEditorOverlayRootKey, null)
const editing = ref(false)
const editCanvas = ref<SVGSVGElement | null>(null)

const lines = () => props.node.attrs.lines as DrawingLine[]

function setLines(nextLines: DrawingLine[]) {
  props.updateAttributes({ lines: nextLines })
}

const {
  color,
  size,
  strokeId,
  bindCanvas,
  onStartDrawing,
  onMove,
  onEndDrawing,
  clear,
} = useDrawingCanvas(editCanvas, lines, setLines)

const sizeModel = computed({
  get: () => [size.value],
  set: (value) => {
    size.value = value?.[0] ?? 1
  },
})

function startEditing() {
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

watch(editing, (isEditing) => {
  if (isEditing) {
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
})
</script>

<template>
  <NodeViewWrapper
    class="draw my-4"
    contenteditable="false"
  >
    <div
      class="relative overflow-hidden rounded-md border border-border/60 bg-background"
      contenteditable="false"
    >
      <button
        v-if="editor.isEditable"
        type="button"
        class="absolute left-2 top-2 z-10 rounded-md border bg-background/90 px-2.5 py-1 text-base shadow-sm hover:bg-muted"
        data-drawing-edit
        contenteditable="false"
        @click="startEditing"
      >
        Edit
      </button>
      <div class="aspect-[2/1] w-full">
        <svg
          viewBox="0 0 500 250"
          class="block h-full w-full"
          aria-hidden="true"
        >
          <DrawingPaths :lines="lines()" />
        </svg>
      </div>
    </div>

    <Teleport
      v-if="editing"
      :to="overlayRoot ?? undefined"
    >
      <div
        class="absolute inset-0 z-50 flex min-h-0 flex-col bg-background"
        data-drawing-editor
        contenteditable="false"
      >
        <div
          class="flex shrink-0 items-center gap-3 border-b px-4 py-3"
          data-drawing-controls
          contenteditable="false"
        >
          <ColorPicker v-model="color" />
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="shrink-0 text-base"
            @click="clear"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            class="shrink-0 text-base"
            @click="stopEditing"
          >
            Done
          </Button>
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
              :lines="lines()"
              :exclude-id="strokeId"
              interactive
            />
          </svg>
        </div>
      </div>
    </Teleport>
  </NodeViewWrapper>
</template>
