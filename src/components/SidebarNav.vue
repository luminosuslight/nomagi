<script setup lang="ts">
import { Plus, Search } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

export type SidebarView = 'files' | 'recent' | 'search'

defineProps<{
  canCreateNote: boolean
}>()

const view = defineModel<SidebarView>({ required: true })

defineEmits<{
  newNote: []
}>()

const tabs: { id: SidebarView; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'files', label: 'Files' },
]

const segmentClass =
  'flex h-9 items-center justify-center rounded-full text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900'
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:p-3"
  >
    <div
      class="flex items-center gap-0.5 rounded-full border border-neutral-200/80 bg-white/70 p-1 shadow-lg backdrop-blur-sm md:flex-1 md:shadow-xs"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="
          cn(segmentClass, 'px-4 md:flex-1', view === tab.id && 'bg-neutral-100 text-neutral-900')
        "
        @click="view = tab.id"
      >
        {{ tab.label }}
      </button>
      <button
        type="button"
        aria-label="Search"
        :class="cn(segmentClass, 'w-10', view === 'search' && 'bg-neutral-100 text-neutral-900')"
        @click="view = 'search'"
      >
        <Search class="size-4" />
      </button>
    </div>
    <button
      type="button"
      aria-label="New note"
      class="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-colors hover:bg-neutral-700 disabled:opacity-40 md:size-11 md:shadow-xs"
      :disabled="!canCreateNote"
      @click="$emit('newNote')"
    >
      <Plus class="size-5" />
    </button>
  </nav>
</template>
