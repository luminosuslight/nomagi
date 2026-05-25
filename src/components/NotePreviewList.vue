<script setup lang="ts">
import { cn } from '@/lib/utils'
import { displayFilename } from '@/lib/noteDisplay'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

export type NotePreviewItem = {
  filepath: string
  preview: string
  subtitle?: string | null
}

defineProps<{
  items: NotePreviewItem[]
  selectedFile: string | null
  isLoading: boolean
  emptyMessage?: string
}>()

const emit = defineEmits<{
  select: [filepath: string]
}>()
</script>

<template>
  <ScrollArea class="min-h-0 flex-1">
    <div
      v-if="isLoading"
      class="space-y-2 p-3"
    >
      <Skeleton
        v-for="n in 5"
        :key="n"
        class="h-14 w-full"
      />
    </div>
    <ul
      v-else-if="items.length"
      class="space-y-1 p-2"
    >
      <li
        v-for="item in items"
        :key="item.filepath"
      >
        <button
          type="button"
          :class="
            cn(
              'w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent',
              selectedFile === item.filepath && 'bg-accent font-medium',
            )
          "
          @click="emit('select', item.filepath)"
        >
          <span
            v-if="displayFilename(item.filepath)"
            class="block truncate text-sm text-muted-foreground"
          >
            {{ displayFilename(item.filepath) }}
          </span>
          <span class="block truncate text-base">{{ item.preview }}</span>
          <span
            v-if="item.subtitle"
            class="block text-sm text-muted-foreground"
          >
            {{ item.subtitle }}
          </span>
        </button>
      </li>
    </ul>
    <p
      v-else
      class="p-4 text-sm text-muted-foreground"
    >
      {{ emptyMessage ?? 'No notes found.' }}
    </p>
  </ScrollArea>
</template>
