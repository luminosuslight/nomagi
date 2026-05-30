<script setup lang="ts">
import { cn } from '@/lib/utils'
import { displayFilename } from '@/lib/noteDisplay'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
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
        class="h-[4.5rem] w-full rounded-lg"
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
                'border-border/50 bg-muted/40 shadow-none transition-colors hover:border-border hover:bg-muted/60',
                selectedFile === item.filepath && 'border-border bg-accent/50 ring-1 ring-ring/25',
              )
            "
          >
            <CardContent class="space-y-1 p-3">
              <span
                v-if="displayFilename(item.filepath)"
                class="block truncate text-xs font-medium text-muted-foreground"
              >
                {{ displayFilename(item.filepath) }}
              </span>
              <span class="block truncate text-sm leading-snug text-foreground/75">
                {{ item.preview }}
              </span>
              <span
                v-if="item.subtitle"
                class="block truncate text-xs text-muted-foreground"
              >
                {{ item.subtitle }}
              </span>
            </CardContent>
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
