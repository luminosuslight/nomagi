<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Check, ExternalLink, Globe, Pencil, Trash2 } from 'lucide-vue-next'
import CanvasFileContent from '@/components/canvas/CanvasFileContent.vue'
import CanvasMarkdownNote from '@/components/canvas/CanvasMarkdownNote.vue'
import Button from '@/components/ui/Button.vue'
import { canvasEditorKey, type CanvasFlowNodeData } from '@/lib/canvas/canvasEditorContext'
import {
  CANVAS_PRESET_COLORS,
  isFileNode,
  isGroupNode,
  isLinkNode,
  isTextNode,
  resolveCanvasColor,
} from '@/lib/canvas/jsonCanvas'
import { isMarkdownFile, isNoteFile } from '@/lib/fileTypes'
import { imageMimeType, isImageUrl } from '@/lib/milkdown/images/imageUrls'
import { cn } from '@/lib/utils'

const props = defineProps<NodeProps<CanvasFlowNodeData>>()

const ctx = inject(canvasEditorKey)!

const node = computed(() => props.data.node)
const textNode = computed(() => (isTextNode(node.value) ? node.value : null))
const fileNode = computed(() => (isFileNode(node.value) ? node.value : null))
const linkNode = computed(() => (isLinkNode(node.value) ? node.value : null))
const groupNode = computed(() => (isGroupNode(node.value) ? node.value : null))

const isEditing = computed(() => ctx.editingId.value === props.id)
const isImage = computed(
  () =>
    (fileNode.value && imageMimeType(fileNode.value.file) !== null) ||
    (linkNode.value && isImageUrl(linkNode.value.url)),
)
const isEditable = computed(
  () =>
    Boolean(textNode.value || groupNode.value) ||
    Boolean(fileNode.value && isMarkdownFile(fileNode.value.file)),
)
const isOpenable = computed(
  () => Boolean(linkNode.value) || Boolean(fileNode.value && isNoteFile(fileNode.value.file)),
)

const color = computed(() => resolveCanvasColor(node.value.color))
const cardStyle = computed(() => {
  if (!color.value) return undefined
  return {
    borderColor: color.value,
    backgroundColor: `color-mix(in srgb, ${color.value} ${groupNode.value ? 8 : 14}%, white)`,
  }
})

const colorOptions = [
  { value: undefined, swatch: '#ffffff', label: 'No color' },
  ...Object.entries(CANVAS_PRESET_COLORS).map(([value, swatch]) => ({
    value,
    swatch,
    label: `Color ${value}`,
  })),
]

const fileContentRef = ref<InstanceType<typeof CanvasFileContent> | null>(null)
const labelInputRef = ref<HTMLInputElement | null>(null)
const labelDraft = ref('')

watch(isEditing, async (editing) => {
  if (!editing || !groupNode.value) return
  labelDraft.value = groupNode.value.label ?? ''
  await nextTick()
  labelInputRef.value?.focus()
  labelInputRef.value?.select()
})

function commitLabel() {
  if (!groupNode.value || !isEditing.value) return
  const label = labelDraft.value.trim()
  if (label !== (groupNode.value.label ?? '')) {
    ctx.patchNode(props.id, { label: label || undefined })
  }
  ctx.stopEditing()
}

function toggleEditing() {
  if (isEditing.value) ctx.stopEditing()
  else ctx.startEditing(props.id)
}

function onDoubleClick() {
  if (isEditable.value && !isEditing.value) ctx.startEditing(props.id)
}

async function open() {
  if (linkNode.value) {
    window.open(linkNode.value.url, '_blank', 'noopener')
    return
  }
  if (!fileNode.value) return
  await fileContentRef.value?.flush()
  ctx.openFile(fileNode.value.file)
}

function setColor(value: string | undefined) {
  ctx.patchNode(props.id, { color: value })
}

const linkHost = computed(() => {
  if (!linkNode.value) return ''
  try {
    return new URL(linkNode.value.url).hostname
  } catch {
    return linkNode.value.url
  }
})
</script>

<template>
  <NodeResizer
    :is-visible="selected"
    :min-width="80"
    :min-height="40"
    :keep-aspect-ratio="isImage ?? false"
    @resize-end="ctx.commitGeometry(id)"
  />
  <NodeToolbar
    :position="Position.Top"
    :is-visible="isEditing ? true : undefined"
    :offset="groupNode ? 36 : 10"
  >
    <div
      class="nodrag nopan flex items-center gap-1 rounded-lg border bg-background p-1 shadow-md"
      @pointerdown.stop
    >
      <Button
        v-if="isEditable"
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="isEditing ? 'Done editing' : 'Edit'"
        @click="toggleEditing"
      >
        <Check
          v-if="isEditing"
          class="size-4"
        />
        <Pencil
          v-else
          class="size-4"
        />
      </Button>
      <Button
        v-if="isOpenable && !isEditing"
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open"
        @click="open"
      >
        <ExternalLink class="size-4" />
      </Button>
      <div
        v-if="!isEditing"
        class="flex items-center gap-1 px-1"
        role="group"
        aria-label="Color"
      >
        <button
          v-for="option in colorOptions"
          :key="option.label"
          type="button"
          :aria-label="option.label"
          :aria-pressed="node.color === option.value"
          :class="
            cn(
              'size-6 rounded-full border border-black/15',
              node.color === option.value && 'ring-2 ring-offset-1 ring-neutral-500',
            )
          "
          :style="{ backgroundColor: option.swatch }"
          @click="setColor(option.value)"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Delete"
        @click="ctx.deleteNode(id)"
      >
        <Trash2 class="size-4" />
      </Button>
    </div>
  </NodeToolbar>

  <div
    v-if="groupNode"
    :class="
      cn(
        'canvas-group relative size-full rounded-xl border-2 border-neutral-300 bg-neutral-500/5',
        selected && 'border-sky-500',
      )
    "
    :style="cardStyle"
  >
    <div class="canvas-group-label absolute bottom-full left-0 mb-1 flex max-w-full">
      <input
        v-if="isEditing"
        ref="labelInputRef"
        v-model="labelDraft"
        type="text"
        class="nodrag nopan rounded-md border bg-background px-2 py-0.5 text-base font-medium outline-none"
        aria-label="Frame label"
        placeholder="Frame"
        @keydown.enter.prevent="commitLabel"
        @keydown.escape.prevent="ctx.stopEditing()"
        @blur="commitLabel"
      >
      <span
        v-else
        class="truncate rounded-md px-2 py-0.5 text-base font-medium"
        :style="color ? { color } : undefined"
        @dblclick="onDoubleClick"
      >
        {{ groupNode.label || 'Frame' }}
      </span>
    </div>
  </div>

  <div
    v-else
    :class="
      cn(
        'relative size-full overflow-hidden rounded-lg border bg-background shadow-sm',
        isImage && !color && 'border-transparent bg-transparent shadow-none',
        selected && 'ring-2 ring-sky-500',
        isEditing && 'nodrag nopan nowheel canvas-node-editing cursor-auto',
      )
    "
    :style="cardStyle"
    @dblclick="onDoubleClick"
  >
    <CanvasMarkdownNote
      v-if="textNode"
      :model-value="textNode.text"
      :editing="isEditing"
      :filename="ctx.filename.value"
      :read-file-binary="ctx.readFileBinary"
      :create-binary-file="ctx.createBinaryFile"
      @update:model-value="ctx.patchNode(id, { text: $event })"
    />
    <CanvasFileContent
      v-else-if="fileNode"
      ref="fileContentRef"
      :node="fileNode"
      :editing="isEditing"
    />
    <img
      v-else-if="linkNode && isImage"
      :src="linkNode.url"
      :alt="linkNode.url"
      draggable="false"
      referrerpolicy="no-referrer"
      class="size-full object-contain"
    >
    <div
      v-else-if="linkNode"
      class="flex size-full items-center gap-3 p-3"
    >
      <Globe class="size-6 shrink-0 text-muted-foreground" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium">
          {{ linkHost }}
        </div>
        <div class="truncate text-xs text-muted-foreground">
          {{ linkNode.url }}
        </div>
      </div>
    </div>
    <div
      v-else
      class="flex size-full items-center justify-center p-3 text-sm text-muted-foreground"
    >
      Unsupported node type “{{ node.type }}”
    </div>
  </div>
  <div
    v-if="fileNode && isMarkdownFile(fileNode.file)"
    class="pointer-events-none absolute bottom-full left-0 mb-1 max-w-full truncate text-xs text-muted-foreground"
  >
    {{ fileNode.file }}
  </div>
</template>
