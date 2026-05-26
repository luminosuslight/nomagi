<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

defineProps<{
  filename: string | null
  modelValue: string
  isLoading: boolean
  isSaving: boolean
  showBack?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  back: []
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center gap-3 border-b px-4 py-3">
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
      <span
        v-if="isSaving"
        class="shrink-0 text-xs text-muted-foreground"
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
      <MilkdownProvider>
        <MilkdownEditor
          :key="filename ?? 'none'"
          :model-value="modelValue"
          :disabled="!filename"
          placeholder="Start writing…"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </MilkdownProvider>
    </div>
  </div>
</template>
