<script setup lang="ts">
import { editorViewCtx } from '@milkdown/core'
import { inject, markRaw, onUnmounted, provide, ref, shallowRef, watch } from 'vue'
import { Milkdown, useEditor } from '@milkdown/vue'
import { Crepe } from '@milkdown/crepe'
import { Selection } from '@milkdown/kit/prose/state'
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
import ImageLightbox, { type LightboxImage } from '@/components/ImageLightbox.vue'
import { imageBlockConfig } from '@milkdown/kit/component/image-block'
import {
  attachImageExpandButtons,
  attachImageResizeUnlock,
  collectImages,
  configurePasteImageUrl,
  createRepoImageResolver,
  imageBlockWithAlt,
} from '@/lib/milkdown/images'
import { jsDrawRemark, jsDrawSchema, jsDrawView } from '@/lib/milkdown/jsDraw'
import { linkChipsPlugin } from '@/lib/milkdown/linkChips'
import { configureLinkPreviewClick } from '@/lib/milkdown/linkPreviewClick'
import { listIndentSpaceInputRule, listOutdentBackspacePlugin } from '@/lib/milkdown/listIndent'
import { tightBulletList, tightListItem, tightOrderedList } from '@/lib/milkdown/tightLists'
import { errorMessage, reportError } from '@/lib/errors'
import { savePastedImage } from '@/lib/pastedImages'
import { cn } from '@/lib/utils'
import { toast } from 'vue-sonner'

import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  /** Read-only without the disabled styling (rendered preview). */
  readonly?: boolean
  class?: string
  /** Repo path of the open note; relative image paths resolve against it. */
  filename?: string | null
  readFileBinary?: (filepath: string) => Promise<Uint8Array>
  /** Commits a new file; pasted and uploaded images are saved through it. */
  createBinaryFile?: (filepath: string, bytes: Uint8Array) => Promise<string>
}>()

/** Images stay thumbnail-sized in the note; the lightbox shows them full size. */
const IMAGE_MAX_HEIGHT_PX = 150

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const crepeRef = shallowRef<Crepe>()
const parentOverlayRoot = inject(editorOverlayRootKey, null)
const localOverlayRoot = ref<HTMLElement | null>(null)
const overlayRoot = parentOverlayRoot ?? localOverlayRoot
const drawingEditing = inject(drawingEditingKey, ref(false))
let lastUserChange = 0
/** When false, markdownUpdated is ignored so parse/normalize does not dirty the note. */
let syncToParent = false
const isUnmounted = ref(false)

const imageResolver = props.readFileBinary
  ? createRepoImageResolver(() => props.filename ?? null, props.readFileBinary)
  : null

async function uploadImage(file: File): Promise<string> {
  try {
    return await savePastedImage(file, props.createBinaryFile!)
  } catch (err) {
    reportError('saveImage', err)
    toast.error(`Could not save image: ${errorMessage(err)}`)
    throw err
  }
}

const editorScrollEl = ref<HTMLElement | null>(null)
const lightboxImages = shallowRef<LightboxImage[]>([])
const lightboxIndex = ref<number | null>(null)

function openLightbox(image: HTMLImageElement) {
  const root = editorScrollEl.value
  if (!root) return
  const images = collectImages(root)
  lightboxImages.value = images.map((img) => ({
    src: img.currentSrc || img.src,
    caption: img.title || img.alt,
  }))
  lightboxIndex.value = Math.max(0, images.indexOf(image))
}

function imageBlockSettings() {
  const crepe = crepeRef.value
  if (!crepe || loading.value) return undefined
  return crepe.editor.action((ctx) => ctx.get(imageBlockConfig.key))
}

watch(editorScrollEl, (root, _prev, onCleanup) => {
  if (!root) return
  const detachButtons = attachImageExpandButtons(root, openLightbox)
  const detachResize = attachImageResizeUnlock(root, imageBlockSettings)
  onCleanup(() => {
    detachButtons()
    detachResize()
  })
})

onUnmounted(() => {
  isUnmounted.value = true
  imageResolver?.dispose()
})

function enableParentSync() {
  syncToParent = true
}

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
      [Crepe.Feature.ImageBlock]: {
        maxHeight: IMAGE_MAX_HEIGHT_PX,
        proxyDomURL: imageResolver?.resolve,
        onUpload: props.createBinaryFile ? uploadImage : undefined,
      },
    },
  })

  crepe.editor
    .use(drawingOverlayRootCtx)
    .use(drawingEditingCtx)
    .config((ctx) => {
      ctx.set(drawingOverlayRootCtx.key, overlayRoot)
      ctx.set(drawingEditingCtx.key, drawingEditing)
    })
    .config(configurePasteImageUrl)
    .config(configureLinkPreviewClick)
    .use(imageBlockWithAlt)
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
    .use(linkChipsPlugin)

  crepe.on((listener) => {
    listener.focus(() => {
      enableParentSync()
    })
    listener.markdownUpdated((_ctx, markdown) => {
      if (!syncToParent || isUnmounted.value) return
      lastUserChange = Date.now()
      emit('update:modelValue', markdown)
    })
  })

  if (props.disabled || props.readonly) {
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
  crepe.setReadonly(!!props.disabled || !!props.readonly || drawingEditing.value)
}

function blurProseMirror() {
  const crepe = crepeRef.value
  if (!crepe || loading.value) return
  crepe.editor.action((ctx) => {
    ctx.get(editorViewCtx).dom.blur()
  })
}

watch(drawingEditing, (editing) => {
  if (editing) enableParentSync()
  syncEditorReadonly()
  if (editing) blurProseMirror()
})

type FocusOptions = { atEnd?: boolean }

/** Focus requested before Crepe finished creating the editor. */
let pendingFocus: FocusOptions | null = null

watch(() => [props.disabled, props.readonly], syncEditorReadonly)
watch(loading, (isLoading) => {
  syncEditorReadonly()
  if (isLoading || !pendingFocus) return
  const options = pendingFocus
  pendingFocus = null
  focus(options)
})

function getMarkdown() {
  return crepeRef.value?.getMarkdown() ?? props.modelValue
}

function focus(options: FocusOptions = {}) {
  const crepe = crepeRef.value
  if (!crepe || loading.value) {
    pendingFocus = options
    return
  }
  enableParentSync()
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    if (options.atEnd) {
      view.dispatch(view.state.tr.setSelection(Selection.atEnd(view.state.doc)))
    }
    view.focus()
  })
}

defineExpose({ getMarkdown, focus })
</script>

<template>
  <div
    v-if="!parentOverlayRoot"
    ref="localOverlayRoot"
    class="absolute inset-0 flex min-h-0 flex-col"
  >
    <div
      ref="editorScrollEl"
      :class="
        cn(
          'milkdown-editor min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-24 text-base focus-visible:outline-none md:px-10 md:pt-8',
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
    ref="editorScrollEl"
    :class="
      cn(
        'milkdown-editor absolute inset-0 overflow-y-auto px-5 pt-5 pb-24 text-base focus-visible:outline-none md:px-10 md:pt-8',
        drawingEditing && 'pointer-events-none overflow-hidden select-none',
        disabled && 'cursor-not-allowed opacity-50',
        $props.class,
      )
    "
  >
    <Milkdown spellcheck="false" />
  </div>
  <ImageLightbox
    v-model="lightboxIndex"
    :images="lightboxImages"
  />
</template>

<style scoped>
.milkdown-editor :deep(.milkdown),
.milkdown-editor :deep(.milkdown .ProseMirror) {
  min-height: 100%;
  font-size: 1rem;
  outline: none;
}

.milkdown-editor :deep(.milkdown) {
  --crepe-font-title: var(--font-sans);
  --crepe-font-default: var(--font-sans);
  --crepe-font-code: var(--font-mono);
  --crepe-color-on-background: var(--color-neutral-800);
  --crepe-color-outline: var(--color-neutral-300);
  --crepe-color-inline-code: var(--color-neutral-700);
  --crepe-color-selected: var(--color-neutral-200);
  width: 100%;
  padding-top: 0;
}

.milkdown-editor :deep(.milkdown .ProseMirror) {
  width: 100%;
  max-width: 42rem;
  margin-inline: auto;
  padding: 0.25rem 0 0;
}

.milkdown-editor :deep(.milkdown .ProseMirror :is(h1, h2, h3, h4, h5, h6)) {
  color: var(--color-neutral-950);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.milkdown-editor :deep(.milkdown .ProseMirror h1) {
  font-size: 1.875rem;
  line-height: 1.25;
  margin-top: 2rem;
}

.milkdown-editor :deep(.milkdown .ProseMirror h2) {
  font-size: 1.375rem;
  line-height: 1.35;
  margin-top: 1.75rem;
}

.milkdown-editor :deep(.milkdown .ProseMirror h3) {
  font-size: 1.125rem;
  margin-top: 1.5rem;
}

.milkdown-editor :deep(.milkdown .ProseMirror :is(h4, h5, h6)) {
  font-size: 1rem;
  margin-top: 1.25rem;
}

.milkdown-editor :deep(.milkdown .milkdown-list-item-block li p) {
  padding: 2px 0;
}

/* Bullet box height = line height + paragraph padding, so the marker centers on the first line. */
.milkdown-editor :deep(.milkdown .milkdown-list-item-block li .label-wrapper),
.milkdown-editor :deep(.milkdown .milkdown-list-item-block li .label-wrapper .label) {
  height: 28px;
}

.milkdown-editor :deep(.milkdown .ProseMirror a) {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--color-neutral-300);
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}

.milkdown-editor :deep(.milkdown .ProseMirror a:hover) {
  text-decoration-color: currentColor;
}

/* Bare URLs render as a domain pill (see linkChips.ts); the URL text stays in the DOM for editing. */
.milkdown-editor :deep(.milkdown .ProseMirror a:has(> .link-chip)) {
  text-decoration: none;
}

.milkdown-editor :deep(.link-chip) {
  font-size: 0;
}

.milkdown-editor :deep(.link-chip::before) {
  content: attr(data-domain) ' ↗';
  display: inline-block;
  padding: 0 0.5rem;
  border-radius: 0.375rem;
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
  font-size: 0.875rem;
  line-height: 1.5rem;
  vertical-align: 1px;
}

.milkdown-editor :deep(.milkdown .ProseMirror a:hover > .link-chip::before) {
  background: var(--color-neutral-200);
  color: var(--color-neutral-900);
}

/* Crepe sizes this at 14px; inputs below 16px make iOS Safari zoom on focus. */
.milkdown-editor :deep(.milkdown-link-edit > .link-edit > .input-area) {
  font-size: 16px;
}

.milkdown-editor :deep(.milkdown .ProseMirror > :first-child),
.milkdown-editor :deep(.milkdown .ProseMirror > .ProseMirror-widget + *),
.milkdown-editor :deep(.milkdown .ProseMirror > .prosemirror-virtual-cursor + *),
.milkdown-editor :deep(.milkdown .ProseMirror > h1:first-of-type) {
  margin-top: 0;
}

.milkdown-editor :deep(.milkdown-image-block .operation > .image-expand-button) {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
}

/* Touch devices have no hover, so show the image toolbar once the image is tapped (selected). */
.milkdown-editor :deep(.milkdown-image-block.selected > .image-wrapper .operation) {
  opacity: 1;
}

/* Left-align block images (Crepe centers them) so they line up with text, also in lists. */
.milkdown-editor :deep(.milkdown-image-block > .image-wrapper) {
  margin-inline: 0;
}

.milkdown-editor :deep(.milkdown-image-block > .caption-input) {
  text-align: left;
}

/* Enlarged images keep their height on narrower screens; letterbox instead of cropping. */
.milkdown-editor :deep(.milkdown-image-block > .image-wrapper img) {
  object-fit: contain;
}

.milkdown-editor :deep(.milkdown-image-inline) {
  position: relative;
}

.milkdown-editor :deep(.milkdown-image-inline > .image-inline-expand-button) {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 4px;
  border: 0;
  border-radius: 50%;
  color: var(--crepe-color-on-inverse);
  background: var(--crepe-color-inverse);
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.milkdown-editor :deep(.milkdown-image-inline:hover > .image-inline-expand-button),
.milkdown-editor :deep(.milkdown-image-inline.selected > .image-inline-expand-button) {
  opacity: 0.6;
}

.milkdown-editor :deep(.milkdown-image-inline > .image-inline-expand-button svg) {
  width: 20px;
  height: 20px;
}

.milkdown-editor :deep(.milkdown-image-inline img) {
  max-width: 100%;
  /* Keep in sync with IMAGE_MAX_HEIGHT_PX. */
  max-height: 150px;
}

.milkdown-editor :deep(figure.sketch),
.milkdown-editor :deep(figure.js-draw-sketch) {
  margin: 0;
}
</style>
