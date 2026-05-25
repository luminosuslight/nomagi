<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { marked } from 'marked'
import { Pencil } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { Drawing } from '@/lib/tiptap/drawingExtension'
import { createTurndownService } from '@/lib/tiptap/markdownDrawing'
import { editorOverlayRootKey } from '@/lib/editorOverlay'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const turndown = createTurndownService()
const overlayRoot = ref<HTMLElement | null>(null)

provide(editorOverlayRootKey, overlayRoot)

function markdownToHtml(markdown: string) {
  if (!markdown) return ''
  return marked.parse(markdown, { async: false }) as string
}

let lastUserChange = 0

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: props.placeholder ?? 'Start writing…',
    }),
    Drawing,
  ],
  editorProps: {
    attributes: {
      class: 'tiptap prose prose-base max-w-none focus:outline-none',
    },
  },
  content: markdownToHtml(props.modelValue),
  editable: !props.disabled,
  onUpdate: ({ editor: e }) => {
    const markdown = turndown.turndown(e.getHTML())
    lastUserChange = Date.now()
    emit('update:modelValue', markdown)
  },
})

function insertDrawing() {
  editor.value?.chain().focus().insertDrawing().run()
}

watch(
  () => props.modelValue,
  (markdown) => {
    if (Date.now() - lastUserChange < 200) return
    const html = markdownToHtml(markdown)
    if (editor.value?.getHTML() === html) return
    editor.value?.commands.setContent(html, { emitUpdate: false })
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    editor.value?.setEditable(!disabled)
  },
)
</script>

<template>
  <div
    ref="overlayRoot"
    class="absolute inset-0 flex min-h-0 flex-col"
  >
    <div
      v-if="editor"
      class="flex shrink-0 items-center gap-1 border-b px-4 py-2"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-8 gap-1.5 px-2 text-base"
        :disabled="disabled"
        title="Insert sketch"
        @click="insertDrawing"
      >
        <Pencil class="size-4" />
        Sketch
      </Button>
    </div>
    <EditorContent
      :editor="editor"
      spellcheck="false"
      :class="
        cn(
          'tiptap-editor min-h-0 flex-1 overflow-y-auto px-4 py-3 text-base focus-visible:outline-none',
          disabled && 'cursor-not-allowed opacity-50',
          $props.class,
        )
      "
    />
  </div>
</template>

<style scoped>
.tiptap-editor :deep(.ProseMirror) {
  width: 100%;
  max-width: 48rem;
  margin-inline: auto;
  min-height: 100%;
}

.tiptap-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--muted-foreground);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.tiptap-editor :deep(figure.sketch) {
  margin: 0;
}
</style>
