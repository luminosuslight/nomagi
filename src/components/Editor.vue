<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, provide, ref, watch } from 'vue'
import { ChevronLeft, Code2, Plus } from 'lucide-vue-next'
import { MilkdownProvider } from '@milkdown/vue'
import MarkdownCodeEditor from '@/components/MarkdownCodeEditor.vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'
const PdfViewer = defineAsyncComponent(() => import('@/components/PdfViewer.vue'))
const CanvasEditor = defineAsyncComponent(() => import('@/components/canvas/CanvasEditor.vue'))
import NoteActionsMenu from '@/components/NoteActionsMenu.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { drawingEditingKey, editorOverlayRootKey } from '@/lib/editorOverlay'
import { isCanvasFile, isPdfFile } from '@/lib/fileTypes'
import { formatNoteDate } from '@/lib/formatNoteDate'
import { listDisplayName, noteFolder } from '@/lib/noteDisplay'
import { cn } from '@/lib/utils'

const props = defineProps<{
  filename: string | null
  modelValue: string
  pdfData?: Uint8Array | null
  files?: string[]
  readFile?: (filepath: string) => Promise<string>
  writeFile?: (filepath: string, content: string) => Promise<void>
  readFileBinary?: (filepath: string) => Promise<Uint8Array>
  createBinaryFile?: (filepath: string, bytes: Uint8Array) => Promise<string>
  isLoading: boolean
  lastModified?: number
  showBack?: boolean
  canCreateNote?: boolean
  deleteDisabled?: boolean
  moveDisabled?: boolean
  renameDisabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  back: []
  newNote: []
  move: []
  delete: []
  rename: [name: string]
  openFile: [filepath: string]
}>()

type EditorMode = 'wysiwyg' | 'code'

const isPdf = computed(() => Boolean(props.filename && isPdfFile(props.filename)))
const isCanvas = computed(() => Boolean(props.filename && isCanvasFile(props.filename)))
const displayName = computed(() => (props.filename ? listDisplayName(props.filename) : null))
const breadcrumb = computed(() =>
  props.filename ? noteFolder(props.filename).split('/').join(' / ') : '',
)
const editedLabel = computed(() => formatNoteDate(props.lastModified ?? 0))

const editorPanel = ref<HTMLElement | null>(null)
const drawingEditing = ref(false)
const editorMode = ref<EditorMode>('wysiwyg')
const renaming = ref(false)
const renameDraft = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
const milkdownEditorRef = ref<InstanceType<typeof MilkdownEditor> | null>(null)
/** Milkdown pushed at least one user-driven update for the open file. */
const wysiwygUserEdited = ref(false)

provide(editorOverlayRootKey, editorPanel)
provide(drawingEditingKey, drawingEditing)

watch(
  () => props.filename,
  () => {
    editorMode.value = 'wysiwyg'
    wysiwygUserEdited.value = false
    renaming.value = false
  },
)

function startRename() {
  if (!props.filename || props.renameDisabled) return
  renameDraft.value = displayName.value ?? ''
  renaming.value = true
  void nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

function cancelRename() {
  renaming.value = false
}

function commitRename() {
  if (!renaming.value || !props.filename) return
  const next = renameDraft.value.trim()
  const current = displayName.value ?? ''
  renaming.value = false
  if (!next || next === current) return
  emit('rename', next)
}

function onWysiwygUpdate(value: string) {
  wysiwygUserEdited.value = true
  emit('update:modelValue', value)
}

function setEditorMode(mode: EditorMode) {
  if (mode === editorMode.value || !props.filename) return
  if (mode === 'code' && editorMode.value === 'wysiwyg' && wysiwygUserEdited.value) {
    const markdown = milkdownEditorRef.value?.getMarkdown()
    if (markdown !== undefined) {
      emit('update:modelValue', markdown)
    }
  }
  editorMode.value = mode
}
</script>

<template>
  <div
    ref="editorPanel"
    class="relative flex h-full min-h-0 flex-1 flex-col"
  >
    <header
      :class="
        cn(
          'flex h-14 shrink-0 items-center gap-1 border-b border-neutral-100 px-2 md:px-4',
          drawingEditing && 'pointer-events-none select-none',
        )
      "
    >
      <Button
        v-if="showBack"
        type="button"
        variant="ghost"
        size="icon"
        class="shrink-0 md:hidden"
        aria-label="Back to files"
        @click="$emit('back')"
      >
        <ChevronLeft class="size-5" />
      </Button>
      <div class="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-base">
        <span
          v-if="breadcrumb"
          class="hidden max-w-[40%] shrink-0 truncate text-neutral-400 md:inline"
        >{{ breadcrumb }} /</span>
        <h2
          v-if="!filename"
          class="truncate text-neutral-400"
        >
          No note selected
        </h2>
        <input
          v-else-if="renaming"
          ref="renameInputRef"
          v-model="renameDraft"
          type="text"
          class="min-w-0 flex-1 rounded-md bg-neutral-100 px-1.5 py-0.5 -mx-1.5 font-medium outline-none"
          aria-label="Rename note"
          @keydown.enter.prevent="commitRename"
          @keydown.escape.prevent="cancelRename"
          @blur="commitRename"
        >
        <button
          v-else
          type="button"
          class="min-w-0 truncate text-left font-medium disabled:cursor-default"
          title="Rename"
          :disabled="renameDisabled"
          @click="startRename"
        >
          {{ displayName }}
        </button>
      </div>
      <span
        v-if="editedLabel"
        class="hidden shrink-0 px-2 text-xs text-neutral-400 lg:inline"
        title="Last edited"
      >
        {{ editedLabel }}
      </span>
      <Button
        v-if="filename && !isPdf"
        type="button"
        variant="ghost"
        size="icon"
        :class="
          cn(
            'shrink-0 text-neutral-500',
            editorMode === 'code' && 'bg-neutral-100 text-neutral-900',
          )
        "
        :title="editorMode === 'code' ? 'Show formatted note' : 'Show markdown source'"
        aria-label="Markdown source"
        :aria-pressed="editorMode === 'code'"
        :disabled="drawingEditing"
        @click="setEditorMode(editorMode === 'code' ? 'wysiwyg' : 'code')"
      >
        <Code2 class="size-4" />
      </Button>
      <NoteActionsMenu
        v-if="filename"
        :rename-disabled="renameDisabled"
        :move-disabled="moveDisabled"
        :delete-disabled="deleteDisabled"
        @rename="startRename"
        @move="$emit('move')"
        @delete="$emit('delete')"
      />
    </header>
    <div
      v-if="isLoading"
      class="mx-auto w-full max-w-2xl space-y-3 px-5 pt-5 md:px-10 md:pt-8"
    >
      <Skeleton class="h-7 w-1/2" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-4/5" />
    </div>
    <div
      v-else
      class="relative min-h-0 flex-1"
    >
      <div
        v-if="!filename"
        class="flex h-full flex-col items-center justify-center gap-4 p-4 text-sm text-neutral-400"
      >
        Pick a note from the list, or start a new one.
        <Button
          type="button"
          variant="outline"
          class="rounded-full"
          :disabled="!canCreateNote"
          @click="$emit('newNote')"
        >
          <Plus class="size-4" />
          New note
        </Button>
      </div>
      <MarkdownCodeEditor
        v-else-if="!isPdf && editorMode === 'code'"
        :key="`${filename}-code`"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <PdfViewer
        v-else-if="isPdf"
        :key="`${filename}-pdf`"
        :data="pdfData ?? null"
      />
      <CanvasEditor
        v-else-if="isCanvas && readFile && writeFile"
        :key="`${filename}-canvas`"
        :model-value="modelValue"
        :filename="filename"
        :files="files ?? []"
        :read-file="readFile"
        :write-file="writeFile"
        :read-file-binary="readFileBinary"
        :create-binary-file="createBinaryFile"
        @update:model-value="$emit('update:modelValue', $event)"
        @open-file="$emit('openFile', $event)"
      />
      <MilkdownProvider v-else>
        <MilkdownEditor
          ref="milkdownEditorRef"
          :key="`${filename}-wysiwyg`"
          :model-value="modelValue"
          :filename="filename"
          :read-file-binary="readFileBinary"
          :create-binary-file="createBinaryFile"
          placeholder="Start writing…"
          @update:model-value="onWysiwygUpdate"
        />
      </MilkdownProvider>
    </div>
  </div>
</template>
