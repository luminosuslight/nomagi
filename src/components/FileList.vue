<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronRight, Folder, FolderPlus, Plus, Trash2 } from 'lucide-vue-next'
import { TreeItem, TreeRoot } from 'reka-ui'
import { ancestorFolderPaths } from '@/lib/noteFolders'
import { buildFileTree, type FileTreeNode } from '@/lib/fileTree'
import { isMarkdownFile } from '@/lib/fileTypes'
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
    emptyMessage?: string
    deleteDisabled?: boolean
    actionsDisabled?: boolean
  }>(),
  {
    folders: () => [],
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
  return { paddingLeft: `${12 + (level - 1) * 12}px` }
}

function onSelect(event: Event, node: FileTreeNode) {
  event.preventDefault()
  if (node.kind === 'file') emit('select', node.path)
}

/** Uppercase suffix for non-markdown notes, or null for `.md`. */
function fileSuffix(filepath: string): string | null {
  if (isMarkdownFile(filepath)) return null
  const base = filepath.slice(filepath.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return null
  return base.slice(dot + 1).toUpperCase()
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
    <template v-else>
      <div class="px-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-full"
          :disabled="actionsDisabled"
          @click="emit('createFolder')"
        >
          <FolderPlus class="size-4" />
          New folder
        </Button>
      </div>
      <TreeRoot
        v-if="hasEntries"
        v-slot="{ flattenItems }"
        v-model:expanded="expanded"
        as="ul"
        class="space-y-1 p-2"
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
              'list-none rounded-md transition-colors',
              item.value.kind === 'file' && 'group hover:bg-accent',
              item.value.kind === 'file' && selectedFile === item.value.path && 'bg-accent',
              item.value.kind === 'folder' && 'cursor-pointer hover:bg-accent',
            )
          "
          :style="indentStyle(item.level)"
          @select="onSelect($event, item.value)"
        >
          <div
            v-if="item.value.kind === 'folder'"
            class="flex items-center gap-2 py-1.5 pr-1 text-sm"
          >
            <ChevronRight
              :class="cn('size-4 shrink-0 transition-transform', isExpanded && 'rotate-90')"
            />
            <Folder class="size-4 shrink-0 opacity-70" />
            <span class="flex min-w-0 flex-1 items-center gap-1.5">
              <span class="truncate font-medium">{{ item.value.name }}</span>
              <span class="shrink-0 text-xs font-medium tabular-nums text-neutral-400">
                {{ item.value.children.length }}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-7 shrink-0"
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
              class="size-7 shrink-0"
              :aria-label="`New note in ${item.value.name}`"
              :disabled="actionsDisabled"
              @click.stop="emit('createInFolder', item.value.path)"
            >
              <Plus class="size-4" />
            </Button>
          </div>
          <div
            v-else
            class="flex items-center pr-1"
          >
            <span
              :class="
                cn(
                  'min-w-0 flex-1 truncate py-2 pr-1 text-left text-sm',
                  selectedFile === item.value.path && 'font-medium',
                )
              "
            >
              {{ listDisplayName(item.value.path) }}
            </span>
            <div class="relative size-7 shrink-0">
              <span
                v-if="fileSuffix(item.value.path)"
                class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold uppercase text-neutral-400 group-hover:invisible group-focus-within:invisible"
              >
                {{ fileSuffix(item.value.path) }}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="absolute inset-0 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0 group-hover:disabled:opacity-100"
                aria-label="Delete note"
                :disabled="deleteDisabled"
                @click.stop="emit('delete', item.value.path)"
              >
                <Trash2 class="size-4" />
              </Button>
            </div>
          </div>
        </TreeItem>
      </TreeRoot>
      <p
        v-else
        class="p-4 text-sm text-muted-foreground"
      >
        {{ emptyMessage }}
      </p>
    </template>
  </ScrollArea>
</template>
