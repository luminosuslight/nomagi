<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { ArrowLeft, Code2, PenLine, Plus, Trash2 } from 'lucide-vue-next'
import { MilkdownProvider } from '@milkdown/vue'
import MarkdownCodeEditor from '@/components/MarkdownCodeEditor.vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { drawingEditingKey, editorOverlayRootKey } from '@/lib/editorOverlay'
import { cn } from '@/lib/utils'

const props = defineProps<{
  filename: string | null
  modelValue: string
  isLoading: boolean
  showBack?: boolean
  canCreateNote?: boolean
  deleteDisabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  back: []
  newNote: []
  delete: []
}>()

type EditorMode = 'wysiwyg' | 'code'

const editorPanel = ref<HTMLElement | null>(null)
const drawingEditing = ref(false)
const editorMode = ref<EditorMode>('wysiwyg')
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
  },
)

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
    <div
      :class="
        cn(
          'flex h-14 shrink-0 items-center gap-3 border-b px-4',
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
        <ArrowLeft class="size-4" />
      </Button>
      <h2 class="min-w-0 flex-1 truncate text-sm font-medium">
        {{ filename ?? 'Select a note' }}
      </h2>
      <div
        v-if="filename"
        class="flex shrink-0 items-center rounded-md border p-0.5"
        role="group"
        aria-label="Editor mode"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2"
          :class="editorMode === 'wysiwyg' && 'bg-accent text-accent-foreground'"
          aria-label="Visual editor"
          :aria-pressed="editorMode === 'wysiwyg'"
          :disabled="drawingEditing"
          @click="setEditorMode('wysiwyg')"
        >
          <PenLine class="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2"
          :class="editorMode === 'code' && 'bg-accent text-accent-foreground'"
          aria-label="Markdown source"
          :aria-pressed="editorMode === 'code'"
          :disabled="drawingEditing"
          @click="setEditorMode('code')"
        >
          <Code2 class="size-4" />
        </Button>
      </div>
      <Button
        v-if="filename"
        type="button"
        variant="ghost"
        size="icon"
        class="shrink-0"
        aria-label="Delete note"
        :disabled="deleteDisabled"
        @click="$emit('delete')"
      >
        <Trash2 class="size-4" />
      </Button>
    </div>
    <div
      v-if="isLoading"
      class="p-4 space-y-2"
    >
      <Skeleton class="h-4 w-1/3" />
      <Skeleton class="h-32 w-full" />
    </div>
    <div
      v-else
      class="relative min-h-0 flex-1"
    >
      <div
        v-if="!filename"
        class="flex h-full flex-col items-center justify-center p-4"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="!canCreateNote"
          @click="$emit('newNote')"
        >
          <Plus class="size-4" />
          New note
        </Button>
      </div>
      <MarkdownCodeEditor
        v-else-if="editorMode === 'code'"
        :key="`${filename}-code`"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <MilkdownProvider v-else>
        <MilkdownEditor
          ref="milkdownEditorRef"
          :key="`${filename}-wysiwyg`"
          :model-value="modelValue"
          placeholder="Start writing…"
          @update:model-value="onWysiwygUpdate"
        />
      </MilkdownProvider>
    </div>
  </div>
</template>
