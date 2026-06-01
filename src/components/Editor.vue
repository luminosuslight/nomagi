<script setup lang="ts">
import { provide, ref } from 'vue'
import { ArrowLeft, Plus } from 'lucide-vue-next'
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { drawingEditingKey, editorOverlayRootKey } from '@/lib/editorOverlay'
import { cn } from '@/lib/utils'

defineProps<{
  filename: string | null
  modelValue: string
  isLoading: boolean
  showBack?: boolean
  canCreateNote?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  back: []
  newNote: []
}>()

const editorPanel = ref<HTMLElement | null>(null)
const drawingEditing = ref(false)

provide(editorOverlayRootKey, editorPanel)
provide(drawingEditingKey, drawingEditing)
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
      <MilkdownProvider v-else>
        <MilkdownEditor
          :key="filename"
          :model-value="modelValue"
          placeholder="Start writing…"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </MilkdownProvider>
    </div>
  </div>
</template>
