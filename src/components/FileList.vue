<script setup lang="ts">
import { cn } from '@/lib/utils'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

defineProps<{
  files: string[]
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
        class="h-8 w-full"
      />
    </div>
    <ul
      v-else-if="files.length"
      class="p-2 space-y-1"
    >
      <li
        v-for="file in files"
        :key="file"
      >
        <button
          type="button"
          :class="
            cn(
              'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
              selectedFile === file && 'bg-accent font-medium',
            )
          "
          @click="emit('select', file)"
        >
          {{ file }}
        </button>
      </li>
    </ul>
    <p
      v-else
      class="p-4 text-sm text-muted-foreground"
    >
      No markdown files found.
    </p>
  </ScrollArea>
</template>
