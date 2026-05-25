<script setup lang="ts">
import { ref } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import TipTapEditor from '@/components/TipTapEditor.vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { cn } from '@/lib/utils'

type EditorKind = 'tiptap' | 'milkdown'

const editorKind = ref<EditorKind>('tiptap')

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
    <div class="flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <h2 class="min-w-0 flex-1 truncate text-sm font-medium">
        {{ filename ?? 'Select a note' }}
      </h2>
      <div class="flex shrink-0 items-center rounded-md border p-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :class="cn('h-7 px-2 text-xs', editorKind === 'tiptap' && 'bg-muted')"
          @click="editorKind = 'tiptap'"
        >
          TipTap
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :class="cn('h-7 px-2 text-xs', editorKind === 'milkdown' && 'bg-muted')"
          @click="editorKind = 'milkdown'"
        >
          Milkdown
        </Button>
      </div>
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
      <TipTapEditor
        v-if="editorKind === 'tiptap'"
        :key="`tiptap-${filename ?? 'none'}`"
        :model-value="modelValue"
        :disabled="!filename"
        placeholder="Start writing…"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <MilkdownProvider v-else>
        <MilkdownEditor
          :key="`milkdown-${filename ?? 'none'}`"
          :model-value="modelValue"
          :disabled="!filename"
          placeholder="Start writing…"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </MilkdownProvider>
    </div>
  </div>
</template>
