<script setup lang="ts">
import { Folder } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { listDisplayName } from '@/lib/noteDisplay'
import type { FileTreeNode } from '@/lib/fileTree'

defineProps<{
  nodes: FileTreeNode[]
  depth: number
  selectedFile: string | null
}>()

const emit = defineEmits<{
  select: [filepath: string]
}>()

const indentStyle = (depth: number) => ({ paddingLeft: `${12 + depth * 12}px` })
</script>

<template>
  <template
    v-for="node in nodes"
    :key="node.kind === 'file' ? node.path : `folder-${node.name}`"
  >
    <li
      v-if="node.kind === 'folder'"
      class="list-none"
    >
      <div
        class="flex items-center gap-2 rounded-md py-1.5 pr-3 text-sm text-muted-foreground"
        :style="indentStyle(depth)"
      >
        <Folder class="size-4 shrink-0 opacity-70" />
        <span class="truncate font-medium">{{ node.name }}</span>
      </div>
      <ul class="space-y-1">
        <FileTreeItems
          :nodes="node.children"
          :depth="depth + 1"
          :selected-file="selectedFile"
          @select="emit('select', $event)"
        />
      </ul>
    </li>
    <li
      v-else
      class="list-none"
    >
      <button
        type="button"
        :class="
          cn(
            'w-full rounded-md py-2 pr-3 text-left text-sm transition-colors hover:bg-accent',
            selectedFile === node.path && 'bg-accent font-medium',
          )
        "
        :style="indentStyle(depth)"
        @click="emit('select', node.path)"
      >
        {{ listDisplayName(node.path) }}
      </button>
    </li>
  </template>
</template>
