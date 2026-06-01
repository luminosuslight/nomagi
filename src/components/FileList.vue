<script setup lang="ts">
import { computed } from 'vue'
import { buildFileTree } from '@/lib/fileTree'
import FileTreeItems from '@/components/FileTreeItems.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const props = defineProps<{
  files: string[]
  selectedFile: string | null
  isLoading: boolean
  emptyMessage?: string
}>()

const emit = defineEmits<{
  select: [filepath: string]
}>()

const tree = computed(() => buildFileTree(props.files))
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
      class="space-y-1 p-2"
    >
      <FileTreeItems
        :nodes="tree"
        :depth="0"
        :selected-file="selectedFile"
        @select="emit('select', $event)"
      />
    </ul>
    <p
      v-else
      class="p-4 text-sm text-muted-foreground"
    >
      {{ emptyMessage ?? 'No markdown files found.' }}
    </p>
  </ScrollArea>
</template>
