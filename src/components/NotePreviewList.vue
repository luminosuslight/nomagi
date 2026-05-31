<script setup lang="ts">
import { cn } from '@/lib/utils'
import { listDisplayName } from '@/lib/noteDisplay'
import Card from '@/components/ui/card/Card.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

export type NotePreviewItem = {
  filepath: string
  preview: string
  headerRight?: string | null
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
        class="h-24 w-full rounded-lg"
      />
    </div>
    <ul
      v-else-if="items.length"
      class="space-y-2 p-3"
    >
      <li
        v-for="item in items"
        :key="item.filepath"
      >
        <button
          type="button"
          class="w-full rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
          @click="emit('select', item.filepath)"
        >
          <Card
            :class="
              cn(
                'overflow-hidden border-border/50 bg-muted/40 p-0 shadow-none transition-colors hover:border-border hover:bg-muted/60',
                selectedFile === item.filepath && 'border-border bg-accent/50 ring-1 ring-ring/25',
              )
            "
          >
            <div
              class="flex items-center gap-2 border-b border-border/50 bg-muted/70 px-3 py-1.5 text-xs"
            >
              <span class="min-w-0 flex-1 truncate font-medium text-muted-foreground">
                {{ listDisplayName(item.filepath) }}
              </span>
              <span
                v-if="item.headerRight"
                class="shrink-0 text-muted-foreground"
              >
                {{ item.headerRight }}
              </span>
            </div>
            <p class="line-clamp-5 whitespace-pre-wrap p-3 text-sm leading-snug text-foreground/75">
              {{ item.preview }}
            </p>
          </Card>
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
