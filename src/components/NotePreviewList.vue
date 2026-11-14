<script setup lang="ts">
import { computed } from 'vue'
import { recencyGroup } from '@/lib/formatNoteDate'
import NoteCard from '@/components/NoteCard.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

export type NotePreviewItem = {
  filepath: string
  preview: string
  lastModified?: number
}

const props = defineProps<{
  items: NotePreviewItem[]
  selectedFile: string | null
  isLoading: boolean
  /** `grid`: two-column post-it cards; `list`: full-width rows with a short preview. */
  layout: 'grid' | 'list'
  /** Section items under Today / Yesterday / This week / Earlier headers. */
  grouped?: boolean
  highlight?: string
  emptyMessage?: string
}>()

const emit = defineEmits<{
  select: [filepath: string]
}>()

const GRID_MAX_LINES = 10

/** Greedily balances cards over two columns by estimated height, keeping row-wise order. */
function toColumns(items: NotePreviewItem[]): NotePreviewItem[][] {
  if (props.layout === 'list') return [items]
  const columns: NotePreviewItem[][] = [[], []]
  const heights = [0, 0]
  for (const item of items) {
    const column = heights[0] <= heights[1] ? 0 : 1
    columns[column].push(item)
    heights[column] += 3 + Math.min(item.preview.split('\n').length, GRID_MAX_LINES)
  }
  return columns
}

const sections = computed(() => {
  if (!props.grouped) return [{ label: null, columns: toColumns(props.items) }]

  const groups = new Map<string, NotePreviewItem[]>()
  for (const item of props.items) {
    const label = recencyGroup(item.lastModified ?? 0)
    groups.set(label, [...(groups.get(label) ?? []), item])
  }
  return [...groups].map(([label, items]) => ({ label, columns: toColumns(items) }))
})
</script>

<template>
  <ScrollArea class="min-h-0 flex-1">
    <div class="p-3 pb-28 md:pb-3">
      <div
        v-if="isLoading"
        class="space-y-2"
      >
        <Skeleton
          v-for="n in 4"
          :key="n"
          class="h-24 w-full rounded-xl"
        />
      </div>
      <template v-else-if="items.length">
        <section
          v-for="section in sections"
          :key="section.label ?? ''"
        >
          <h2
            v-if="section.label"
            class="px-1 pt-2 pb-2 text-[11px] font-medium tracking-wide text-neutral-400 uppercase"
          >
            {{ section.label }}
          </h2>
          <div class="flex items-start gap-2 pb-2">
            <ul
              v-for="(column, columnIndex) in section.columns"
              :key="columnIndex"
              class="flex min-w-0 flex-1 flex-col gap-2"
            >
              <li
                v-for="item in column"
                :key="item.filepath"
              >
                <NoteCard
                  v-bind="item"
                  :selected="selectedFile === item.filepath"
                  :highlight="highlight"
                  :clamp-class="layout === 'grid' ? 'line-clamp-10' : 'line-clamp-3'"
                  @select="emit('select', item.filepath)"
                />
              </li>
            </ul>
          </div>
        </section>
      </template>
      <p
        v-else
        class="p-1 text-sm text-muted-foreground"
      >
        {{ emptyMessage ?? 'No notes found.' }}
      </p>
    </div>
  </ScrollArea>
</template>
