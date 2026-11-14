<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'

const props = defineProps<{
  modelValue: string
  editing: boolean
  /** Repo path relative image paths resolve against. */
  filename: string
  readFileBinary?: (filepath: string) => Promise<Uint8Array>
  createBinaryFile?: (filepath: string, bytes: Uint8Array) => Promise<string>
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<InstanceType<typeof MilkdownEditor> | null>(null)

watch(
  () => props.editing,
  async (editing) => {
    if (!editing) return
    await nextTick()
    editorRef.value?.focus({ atEnd: true })
  },
)
</script>

<template>
  <div class="canvas-markdown absolute inset-0">
    <MilkdownProvider>
      <MilkdownEditor
        ref="editorRef"
        :model-value="modelValue"
        :readonly="!editing"
        :filename="filename"
        :read-file-binary="readFileBinary"
        :create-binary-file="createBinaryFile"
        :placeholder="placeholder ?? 'Write something…'"
        :class="editing ? 'px-3 py-2' : 'overflow-hidden px-3 py-2'"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </MilkdownProvider>
  </div>
</template>

<style scoped>
.canvas-markdown :deep(.milkdown) {
  background: transparent;
}

.canvas-markdown :deep(.milkdown .ProseMirror) {
  max-width: none;
}
</style>
