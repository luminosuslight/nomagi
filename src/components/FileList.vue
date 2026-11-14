<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderPlus,
  Plus,
  Shapes,
  Trash2,
} from 'lucide-vue-next'
import { TreeItem, TreeRoot } from 'reka-ui'
import { ancestorFolderPaths } from '@/lib/noteFolders'
import { buildFileTree, type FileTreeNode } from '@/lib/fileTree'
import { isCanvasFile, isPdfFile } from '@/lib/fileTypes'
import { formatNoteDate } from '@/lib/formatNoteDate'
import { listDisplayName } from '@/lib/noteDisplay'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const props = withDefaults(
  defineProps<{
    files: string[]
    folders?: string[]
    selectedFile: string | null
    isLoading: boolean
    /** Last-changed timestamps by filepath. */
    dates?: Record<string, number>
    emptyMessage?: string
    deleteDisabled?: boolean
    actionsDisabled?: boolean
  }>(),
  {
    folders: () => [],
    dates: () => ({}),
    emptyMessage: 'No markdown files found.',
    actionsDisabled: false,
  },
)

const emit = defineEmits<{
  select: [filepath: string]
  delete: [filepath: string]
  createFolder: []
  createSubfolder: [folder: string]
  createInFolder: [folder: string]
}>()

const expanded = ref<string[]>([])

const tree = computed(() => buildFileTree(props.files, props.folders))
const hasEntries = computed(() => props.files.length > 0 || props.folders.length > 0)

watch(
  () => props.selectedFile,
  (filepath) => {
    if (!filepath) return
    const ancestors = ancestorFolderPaths(filepath)
    if (ancestors.length === 0) return
    const next = new Set(expanded.value)
    let changed = false
    for (const folder of ancestors) {
      if (!next.has(folder)) {
        next.add(folder)
        changed = true
      }
    }
    if (changed) expanded.value = [...next]
  },
  { immediate: true },
)

function nodeKey(node: FileTreeNode): string {
  return node.path
}

function nodeChildren(node: FileTreeNode): FileTreeNode[] | undefined {
  return node.kind === 'folder' ? node.children : undefined
}

function indentStyle(level: number) {
  return { paddingLeft: `${8 + (level - 1) * 16}px` }
}

function onSelect(event: Event, node: FileTreeNode) {
  event.preventDefault()
  if (node.kind === 'file') emit('select', node.path)
}

function fileIcon(filepath: string) {
  if (isPdfFile(filepath)) return File
  if (isCanvasFile(filepath)) return Shapes
  return FileText
}
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
    <div
      v-else
      class="px-2 pb-28 md:pb-3"
    >
      <TreeRoot
        v-if="hasEntries"
        v-slot="{ flattenItems }"
        v-model:expanded="expanded"
        as="ul"
        class="space-y-px"
        :items="tree"
        :get-key="nodeKey"
        :get-children="nodeChildren"
        :default-expanded="[]"
      >
        <TreeItem
          v-for="item in flattenItems"
          :key="item._id"
          v-slot="{ isExpanded }"
          v-bind="item.bind"
          :class="
            cn(
              'group flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg pr-1 text-sm transition-colors hover:bg-neutral-200/50',
              selectedFile === item.value.path &&
                'bg-neutral-200/70 font-medium hover:bg-neutral-200/70',
            )
          "
          :style="indentStyle(item.level)"
          @select="onSelect($event, item.value)"
        >
          <template v-if="item.value.kind === 'folder'">
            <ChevronRight
              :class="
                cn(
                  'size-3.5 shrink-0 text-neutral-400 transition-transform',
                  isExpanded && 'rotate-90',
                )
              "
            />
            <Folder class="size-4 shrink-0 text-neutral-500" />
            <span class="truncate font-medium">{{ item.value.name }}</span>
            <span class="mr-auto shrink-0 text-[11px] text-neutral-400 tabular-nums">
              {{ item.value.children.length }}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-7 shrink-0 text-neutral-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              :aria-label="`New folder in ${item.value.name}`"
              :disabled="actionsDisabled"
              @click.stop="emit('createSubfolder', item.value.path)"
            >
              <FolderPlus class="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-7 shrink-0 text-neutral-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              :aria-label="`New note in ${item.value.name}`"
              :disabled="actionsDisabled"
              @click.stop="emit('createInFolder', item.value.path)"
            >
              <Plus class="size-4" />
            </Button>
          </template>
          <template v-else>
            <component
              :is="fileIcon(item.value.path)"
              class="ml-5.5 size-4 shrink-0 text-neutral-400"
            />
            <span class="min-w-0 flex-1 truncate">{{ listDisplayName(item.value.path) }}</span>
            <span
              class="shrink-0 text-[11px] font-normal text-neutral-400 tabular-nums group-hover:hidden group-focus-within:hidden"
            >
              {{ formatNoteDate(dates[item.value.path] ?? 0) }}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="hidden size-7 shrink-0 text-neutral-500 group-hover:flex group-focus-within:flex"
              aria-label="Delete note"
              :disabled="deleteDisabled"
              @click.stop="emit('delete', item.value.path)"
            >
              <Trash2 class="size-4" />
            </Button>
          </template>
        </TreeItem>
      </TreeRoot>
      <p
        v-else
        class="p-2 text-sm text-muted-foreground"
      >
        {{ emptyMessage }}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="mt-1 w-full justify-start gap-2 pl-2 text-neutral-500"
        :disabled="actionsDisabled"
        @click="emit('createFolder')"
      >
        <FolderPlus class="size-4" />
        New folder
      </Button>
    </div>
  </ScrollArea>
</template>
