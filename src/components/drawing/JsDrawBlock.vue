<script setup lang="ts">
import Editor from 'js-draw'
import 'js-draw/bundledStyles'

import { computed, isRef, nextTick, onUnmounted, ref, watch, type Ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

const props = defineProps<{
  svgMarkup: string | Ref<string>
  editable: boolean | Ref<boolean>
  overlayRoot?: HTMLElement | null | Ref<HTMLElement | null | null>
  drawingEditing?: Ref<boolean> | null
  onUpdateSvgMarkup: (svgMarkup: string) => void
}>()

const editing = ref(false)
const editorHost = ref<HTMLElement | null>(null)
const previewHost = ref<HTMLElement | null>(null)
let editor: Editor | null = null

const svgMarkupValue = computed(() =>
  isRef(props.svgMarkup) ? props.svgMarkup.value : props.svgMarkup,
)

const editableValue = computed(() =>
  isRef(props.editable) ? props.editable.value : props.editable,
)

const overlayTarget = computed(() => {
  const value = props.overlayRoot
  if (value == null) return undefined
  return isRef(value) ? (value.value ?? undefined) : value
})

const previewSvg = computed(() => {
  const markup = svgMarkupValue.value.trim()
  if (!markup) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250"></svg>'
  }
  return markup
})

function updatePreview() {
  const host = previewHost.value
  if (!host) return

  host.replaceChildren()
  const doc = new DOMParser().parseFromString(previewSvg.value, 'image/svg+xml')
  const svg = doc.documentElement
  if (svg.tagName === 'svg') {
    host.appendChild(document.importNode(svg, true))
  }
}

function destroyEditor() {
  editor?.remove()
  editor = null
}

async function mountEditor() {
  const host = editorHost.value
  if (!host) return

  destroyEditor()
  host.replaceChildren()

  editor = new Editor(host, {
    wheelEventsEnabled: 'only-if-focused',
  })

  const toolbar = editor.addToolbar()
  toolbar.addSaveButton(() => stopEditing())
  toolbar.addExitButton(() => stopEditing())

  const root = editor.getRootElement()
  root.style.height = '100%'
  root.style.minHeight = '0'

  const markup = svgMarkupValue.value.trim()
  if (markup) {
    await editor.loadFromSVG(markup)
  }
}

function startEditing() {
  editing.value = true
}

function stopEditing() {
  if (editor) {
    props.onUpdateSvgMarkup(editor.toSVG().outerHTML)
  }
  editing.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    stopEditing()
  }
}

watch(svgMarkupValue, () => {
  void nextTick(updatePreview)
})

watch(editing, async (isEditing) => {
  if (props.drawingEditing) {
    props.drawingEditing.value = isEditing
  }

  if (isEditing) {
    await nextTick()
    await mountEditor()
    window.addEventListener('keydown', onKeydown)
    return
  }

  destroyEditor()
  window.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  destroyEditor()
  window.removeEventListener('keydown', onKeydown)
  if (props.drawingEditing) {
    props.drawingEditing.value = false
  }
})

watch(previewHost, (host) => {
  if (host) updatePreview()
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
      @click="startEditing"
    >
      <Pencil class="size-4" />
      Edit
    </Button>
    <div
      ref="previewHost"
      class="js-draw-preview aspect-[2/1] w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      aria-hidden="true"
    />
  </div>

  <Teleport
    v-if="editing"
    :to="overlayTarget"
  >
    <div
      class="absolute inset-0 z-50 flex min-h-0 touch-none flex-col overscroll-contain bg-background"
      data-js-draw-editor
      contenteditable="false"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div
          ref="editorHost"
          class="js-draw-host min-h-0 flex-1"
          data-js-draw-host
        />
      </div>
      <div
        class="flex shrink-0 justify-end border-t px-4 py-3"
        data-drawing-controls
        contenteditable="false"
      >
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
  </Teleport>
</template>

<style>
.milkdown .milkdown-js-draw-block .js-draw-host .imageEditorContainer {
  height: 100%;
}

.milkdown .milkdown-js-draw-block button {
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

.milkdown .milkdown-js-draw-block button:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
</style>
