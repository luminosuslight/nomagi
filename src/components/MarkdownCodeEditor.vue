<script setup lang="ts">
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { basicLight } from '@fsegurai/codemirror-theme-basic-light'
import { tags } from '@lezer/highlight'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { scheduleFoldFigureElements } from '@/lib/markdownCodeEditor/foldFigureElements'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let lastUserChange = 0
const editableCompartment = new Compartment()

function createEditor(parent: HTMLElement) {
  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        basicLight,
        EditorView.lineWrapping,
        editableCompartment.of(EditorView.editable.of(!props.disabled)),
        EditorView.theme({
          '&': {
            backgroundColor: 'transparent',
            fontSize: '1rem',
            height: '100%',
          },
          '.cm-scroller': {
            lineHeight: '1.625',
          },
          '.cm-content': {
            fontSize: '1rem',
            padding: '0.25rem 0 0.75rem',
          },
          '.cm-gutters': {
            backgroundColor: 'transparent !important',
            border: 'none',
          },
          '.cm-gutter': {
            backgroundColor: 'transparent !important',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'transparent !important',
          },
          '.cm-activeLine': {
            backgroundColor: 'color-mix(in oklch, var(--accent) 50%, transparent)',
          },
          '&.cm-focused': {
            outline: 'none !important',
            boxShadow: 'none !important',
          },
        }),
        // After basicLight; scoped CSS sets color to override the theme's generated class.
        syntaxHighlighting(
          HighlightStyle.define([{ tag: tags.monospace, class: 'cm-md-inline-code' }]),
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            lastUserChange = Date.now()
            emit('update:modelValue', update.state.doc.toString())
          }
        }),
      ],
    }),
    parent,
  })
  scheduleFoldFigureElements(view)
}

function syncEditable() {
  if (!view) return
  view.dispatch({
    effects: editableCompartment.reconfigure(EditorView.editable.of(!props.disabled)),
  })
}

function syncDocument(value: string) {
  if (!view) return
  const current = view.state.doc.toString()
  if (current === value) return
  view.dispatch({
    changes: { from: 0, to: current.length, insert: value },
  })
  scheduleFoldFigureElements(view)
}

onMounted(() => {
  if (host.value) createEditor(host.value)
})

onUnmounted(() => {
  view?.destroy()
  view = null
})

watch(
  () => props.modelValue,
  (value) => {
    if (!view) return
    if (Date.now() - lastUserChange < 200) return
    syncDocument(value)
  },
)

watch(() => props.disabled, syncEditable)
</script>

<template>
  <div
    ref="host"
    spellcheck="false"
    :class="
      cn(
        'markdown-code-editor h-full min-h-0 overflow-y-auto px-4 pb-3 pt-1 text-base focus-visible:outline-none',
        disabled && 'cursor-not-allowed opacity-50',
        $props.class,
      )
    "
  />
</template>

<style scoped>
.markdown-code-editor :deep(.cm-editor) {
  width: 100%;
  max-width: 48rem;
  margin-inline: auto;
  min-height: 100%;
  outline: none;
}

.markdown-code-editor :deep(.cm-editor.cm-focused) {
  outline: none !important;
  box-shadow: none !important;
}

.markdown-code-editor :deep(.cm-gutters),
.markdown-code-editor :deep(.cm-gutter),
.markdown-code-editor :deep(.cm-activeLineGutter) {
  background-color: transparent !important;
}

.markdown-code-editor :deep(.cm-md-inline-code) {
  color: var(--muted-foreground) !important;
}
</style>
