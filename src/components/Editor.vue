<script setup lang="ts">
import TipTapEditor from '@/components/TipTapEditor.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

defineProps<{
  filename: string | null
  modelValue: string
  isLoading: boolean
  isSaving: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center justify-between border-b px-4 py-3">
      <h2 class="truncate text-sm font-medium">
        {{ filename ?? 'Select a note' }}
      </h2>
      <span
        v-if="isSaving"
        class="text-xs text-muted-foreground"
      >Saving…</span>
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
      <TipTapEditor
        :key="filename ?? 'none'"
        :model-value="modelValue"
        :disabled="!filename"
        placeholder="Start writing…"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>
