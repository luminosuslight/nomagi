<script setup lang="ts">
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import { FileText, ImageOff, LayoutDashboard } from 'lucide-vue-next'
import CanvasMarkdownNote from '@/components/canvas/CanvasMarkdownNote.vue'
import Button from '@/components/ui/Button.vue'
import { canvasEditorKey } from '@/lib/canvas/canvasEditorContext'
import type { CanvasFileNode } from '@/lib/canvas/jsonCanvas'
import { errorMessage, reportError } from '@/lib/errors'
import { isCanvasFile, isMarkdownFile, isPdfFile } from '@/lib/fileTypes'
import { imageMimeType } from '@/lib/milkdown/images/imageUrls'
import { listDisplayName } from '@/lib/noteDisplay'

const SAVE_DEBOUNCE_MS = 800

const props = defineProps<{
  node: CanvasFileNode
  editing: boolean
}>()

const ctx = inject(canvasEditorKey)!

const kind = computed(() => {
  if (isMarkdownFile(props.node.file)) return 'markdown'
  if (imageMimeType(props.node.file)) return 'image'
  return 'other'
})

const markdown = ref('')
const imageSrc = ref<string | null>(null)
const loadError = ref<string | null>(null)
const loaded = ref(false)

let saveTimer: ReturnType<typeof setTimeout> | null = null
let dirty = false
let saving: Promise<void> = Promise.resolve()

async function load() {
  loaded.value = false
  loadError.value = null
  imageSrc.value = null
  try {
    if (kind.value === 'markdown') {
      markdown.value = await ctx.readFile(props.node.file)
    } else if (kind.value === 'image') {
      imageSrc.value = await ctx.resolveRepoImage(props.node.file)
    }
  } catch (err) {
    loadError.value = errorMessage(err)
  } finally {
    loaded.value = true
  }
}

watch(() => props.node.file, load, { immediate: true })

function save() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (!dirty) return saving
  dirty = false
  const filepath = props.node.file
  const content = markdown.value
  saving = saving
    .then(() => ctx.writeFile(filepath, content))
    .catch((err) => reportError('save canvas file note', err))
  return saving
}

function onMarkdownUpdate(value: string) {
  markdown.value = value
  dirty = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS)
}

watch(
  () => props.editing,
  (editing) => {
    if (!editing) void save()
  },
)

onUnmounted(() => {
  void save()
})

/** Resolves once pending edits of an embedded note are written. */
function flush(): Promise<void> {
  return save()
}

defineExpose({ flush })

const otherIcon = computed(() => (isCanvasFile(props.node.file) ? LayoutDashboard : FileText))
const otherLabel = computed(() => {
  if (isPdfFile(props.node.file)) return 'PDF'
  if (isCanvasFile(props.node.file)) return 'Whiteboard'
  return 'File'
})
</script>

<template>
  <div
    v-if="loadError"
    class="flex size-full flex-col items-center justify-center gap-1 p-3 text-center text-sm text-muted-foreground"
  >
    <ImageOff
      v-if="kind === 'image'"
      class="size-5"
    />
    <span class="font-medium text-foreground">{{ node.file }}</span>
    <span>File not found</span>
  </div>
  <CanvasMarkdownNote
    v-else-if="kind === 'markdown' && loaded"
    :model-value="markdown"
    :editing="editing"
    :filename="node.file"
    :read-file-binary="ctx.readFileBinary"
    :create-binary-file="ctx.createBinaryFile"
    @update:model-value="onMarkdownUpdate"
  />
  <img
    v-else-if="kind === 'image' && imageSrc"
    :src="imageSrc"
    :alt="node.file"
    draggable="false"
    class="size-full object-contain"
  >
  <div
    v-else-if="kind === 'other'"
    class="flex size-full items-center gap-3 p-3"
  >
    <component
      :is="otherIcon"
      class="size-6 shrink-0 text-muted-foreground"
    />
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium">
        {{ listDisplayName(node.file) }}
      </div>
      <div class="text-xs text-muted-foreground">
        {{ otherLabel }}
      </div>
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="nodrag shrink-0"
      @click.stop="ctx.openFile(node.file)"
    >
      Open
    </Button>
  </div>
</template>
