<script setup lang="ts">
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import type { RecentNote } from '@/composables/useGit'

defineProps<{
  notes: RecentNote[]
  selectedFile: string | null
  isLoading: boolean
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
        class="h-10 w-full"
      />
    </div>
    <ul
      v-else-if="notes.length"
      class="space-y-1 p-2"
    >
      <li
        v-for="note in notes"
        :key="note.filepath"
      >
        <button
          type="button"
          :class="
            cn(
              'w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent',
              selectedFile === note.filepath && 'bg-accent font-medium',
            )
          "
          @click="emit('select', note.filepath)"
        >
          <span class="block truncate text-sm">{{ note.filepath }}</span>
          <span class="block text-sm text-muted-foreground">
            {{ formatRelativeTime(note.lastModified) }}
          </span>
        </button>
      </li>
    </ul>
    <p
      v-else
      class="p-4 text-sm text-muted-foreground"
    >
      No notes found.
    </p>
  </ScrollArea>
</template>
