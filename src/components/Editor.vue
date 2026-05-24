<script setup lang="ts">
import Textarea from '@/components/ui/Textarea.vue'
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
      <Textarea
        :model-value="modelValue"
        :disabled="!filename"
        class="absolute inset-0 h-full min-h-0 w-full resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
        placeholder="Start writing…"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>
