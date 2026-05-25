<script setup lang="ts">
import { ref, watch } from 'vue'
import { Milkdown, useEditor } from '@milkdown/vue'
import { Crepe } from '@milkdown/crepe'
import { replaceAll } from '@milkdown/utils'
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

const crepeRef = ref<Crepe>()
let lastUserChange = 0

const { loading } = useEditor((root) => {
  const crepe = new Crepe({
    root,
    defaultValue: props.modelValue,
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: props.placeholder ?? 'Start writing…',
      },
    },
  })

  crepe.on((listener) => {
    listener.markdownUpdated((_ctx, markdown) => {
      lastUserChange = Date.now()
      emit('update:modelValue', markdown)
    })
  })

  if (props.disabled) {
    crepe.setReadonly(true)
  }

  crepeRef.value = crepe
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

watch(
  () => props.disabled,
  (disabled) => {
    crepeRef.value?.setReadonly(!!disabled)
  },
)
</script>

<template>
  <div
    :class="
      cn(
        'milkdown-editor absolute inset-0 h-full min-h-0 overflow-y-auto px-4 pb-3 pt-1 text-base focus-visible:outline-none',
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
</style>
