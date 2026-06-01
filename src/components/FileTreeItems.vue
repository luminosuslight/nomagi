<script setup lang="ts">
import { Folder, Trash2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { listDisplayName } from '@/lib/noteDisplay'
import type { FileTreeNode } from '@/lib/fileTree'
import Button from '@/components/ui/Button.vue'

defineProps<{
  nodes: FileTreeNode[]
  depth: number
  selectedFile: string | null
  deleteDisabled?: boolean
}>()

const emit = defineEmits<{
  select: [filepath: string]
  delete: [filepath: string]
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
          :delete-disabled="deleteDisabled"
          @select="emit('select', $event)"
          @delete="emit('delete', $event)"
        />
      </ul>
    </li>
    <li
      v-else
      class="group list-none flex items-center rounded-md pr-1 transition-colors hover:bg-accent"
      :class="selectedFile === node.path && 'bg-accent'"
      :style="indentStyle(depth)"
    >
      <button
        type="button"
        :class="
          cn(
            'min-w-0 flex-1 truncate py-2 pr-1 text-left text-sm transition-colors',
            selectedFile === node.path && 'font-medium',
          )
        "
        @click="emit('select', node.path)"
      >
        {{ listDisplayName(node.path) }}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Delete note"
        :disabled="deleteDisabled"
        @click.stop="emit('delete', node.path)"
      >
        <Trash2 class="size-4" />
      </Button>
    </li>
  </template>
</template>
