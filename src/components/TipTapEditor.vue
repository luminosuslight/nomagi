<script setup lang="ts">
import { watch } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { marked } from 'marked'
import TurndownService from 'turndown'
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

const turndown = new TurndownService({ headingStyle: 'atx' })
turndown.escape = (string: string) => string

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
  <EditorContent
    :editor="editor"
    spellcheck="false"
    :class="
      cn(
        'tiptap-editor absolute inset-0 h-full min-h-0 overflow-y-auto px-4 py-3 text-base focus-visible:outline-none',
        disabled && 'cursor-not-allowed opacity-50',
        $props.class,
      )
    "
  />
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
</style>
