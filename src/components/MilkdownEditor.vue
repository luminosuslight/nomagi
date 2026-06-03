<script setup lang="ts">
import { editorViewCtx } from '@milkdown/core'
import { inject, markRaw, provide, ref, shallowRef, watch } from 'vue'
import { Milkdown, useEditor } from '@milkdown/vue'
import { Crepe } from '@milkdown/crepe'
import { replaceAll } from '@milkdown/kit/utils'
import { drawingEditingKey, editorOverlayRootKey } from '@/lib/editorOverlay'
import {
  drawingEditingCtx,
  drawingOverlayRootCtx,
  drawingRemark,
  drawingSchema,
  drawingView,
  insertDrawingCommand,
  sketchSlashMenuConfig,
} from '@/lib/milkdown/drawing'
import { jsDrawRemark, jsDrawSchema, jsDrawView } from '@/lib/milkdown/jsDraw'
import { listIndentSpaceInputRule, listOutdentBackspacePlugin } from '@/lib/milkdown/listIndent'
import { tightBulletList, tightListItem, tightOrderedList } from '@/lib/milkdown/tightLists'
import { cn } from '@/lib/utils'

import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const crepeRef = shallowRef<Crepe>()
const parentOverlayRoot = inject(editorOverlayRootKey, null)
const localOverlayRoot = ref<HTMLElement | null>(null)
const overlayRoot = parentOverlayRoot ?? localOverlayRoot
const drawingEditing = inject(drawingEditingKey, ref(false))
let lastUserChange = 0

if (!parentOverlayRoot) {
  provide(editorOverlayRootKey, localOverlayRoot)
}

const { loading } = useEditor((root) => {
  const crepe = new Crepe({
    root,
    defaultValue: props.modelValue,
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: props.placeholder ?? 'Start writing…',
      },
      [Crepe.Feature.BlockEdit]: sketchSlashMenuConfig,
    },
  })

  crepe.editor
    .use(drawingOverlayRootCtx)
    .use(drawingEditingCtx)
    .config((ctx) => {
      ctx.set(drawingOverlayRootCtx.key, overlayRoot)
      ctx.set(drawingEditingCtx.key, drawingEditing)
    })
    .use(tightListItem)
    .use(tightBulletList)
    .use(tightOrderedList)
    .use(drawingRemark)
    .use(drawingSchema)
    .use(drawingView)
    .use(insertDrawingCommand)
    .use(jsDrawRemark)
    .use(jsDrawSchema)
    .use(jsDrawView)
    .use(listIndentSpaceInputRule)
    .use(listOutdentBackspacePlugin)

  crepe.on((listener) => {
    listener.markdownUpdated((_ctx, markdown) => {
      lastUserChange = Date.now()
      emit('update:modelValue', markdown)
    })
  })

  if (props.disabled) {
    crepe.setReadonly(true)
  }

  crepeRef.value = markRaw(crepe)
  return crepe
})

watch(
  () => props.modelValue,
  (markdown) => {
    if (loading.value) return
    if (Date.now() - lastUserChange < 200) return
    const crepe = crepeRef.value
    if (!crepe) return
    if (crepe.getMarkdown() === markdown) return
    crepe.editor.action(replaceAll(markdown, true))
  },
)

function syncEditorReadonly() {
  const crepe = crepeRef.value
  if (!crepe || loading.value) return
  crepe.setReadonly(!!props.disabled || drawingEditing.value)
}

function blurProseMirror() {
  const crepe = crepeRef.value
  if (!crepe || loading.value) return
  crepe.editor.action((ctx) => {
    ctx.get(editorViewCtx).dom.blur()
  })
}

watch(drawingEditing, (editing) => {
  syncEditorReadonly()
  if (editing) blurProseMirror()
})

watch(() => props.disabled, syncEditorReadonly)

function getMarkdown() {
  return crepeRef.value?.getMarkdown() ?? props.modelValue
}

defineExpose({ getMarkdown })
</script>

<template>
  <div
    v-if="!parentOverlayRoot"
    ref="localOverlayRoot"
    class="absolute inset-0 flex min-h-0 flex-col"
  >
    <div
      :class="
        cn(
          'milkdown-editor min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-1 text-base focus-visible:outline-none',
          drawingEditing && 'pointer-events-none overflow-hidden select-none',
          disabled && 'cursor-not-allowed opacity-50',
          $props.class,
        )
      "
    >
      <Milkdown spellcheck="false" />
    </div>
  </div>
  <div
    v-else
    :class="
      cn(
        'milkdown-editor absolute inset-0 overflow-y-auto px-4 pb-3 pt-1 text-base focus-visible:outline-none',
        drawingEditing && 'pointer-events-none overflow-hidden select-none',
        disabled && 'cursor-not-allowed opacity-50',
        $props.class,
      )
    "
  >
    <Milkdown spellcheck="false" />
  </div>
</template>

<style scoped>
.milkdown-editor :deep(.milkdown),
.milkdown-editor :deep(.milkdown .ProseMirror) {
  min-height: 100%;
  font-size: 1rem;
  outline: none;
}

.milkdown-editor :deep(.milkdown) {
  width: 100%;
  padding-top: 0;
}

.milkdown-editor :deep(.milkdown .ProseMirror) {
  width: 100%;
  max-width: 48rem;
  margin-inline: auto;
  padding: 0.25rem 0 0;
}

.milkdown-editor :deep(.milkdown .ProseMirror > :first-child),
.milkdown-editor :deep(.milkdown .ProseMirror > .ProseMirror-widget + *),
.milkdown-editor :deep(.milkdown .ProseMirror > .prosemirror-virtual-cursor + *),
.milkdown-editor :deep(.milkdown .ProseMirror > h1:first-of-type) {
  margin-top: 0;
}

.milkdown-editor :deep(figure.sketch),
.milkdown-editor :deep(figure.js-draw-sketch) {
  margin: 0;
}
</style>
