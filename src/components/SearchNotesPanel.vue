<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import { searchNotes } from '@/lib/searchNotes'
import NotePreviewList, { type NotePreviewItem } from '@/components/NotePreviewList.vue'

const props = defineProps<{
  files: string[]
  readFile: (path: string) => Promise<string>
  selectedFile: string | null
  /** Last-changed timestamps by filepath. */
  dates: Record<string, number>
}>()

const emit = defineEmits<{
  select: [filepath: string]
}>()

const query = defineModel<string>('query', { default: '' })
const debouncedQuery = ref(query.value)
const results = ref<NotePreviewItem[]>([])
const isSearching = ref(false)
const input = useTemplateRef('input')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value
  }, 300)
})

watch(
  () => [debouncedQuery.value, props.files] as const,
  async ([value]) => {
    if (!value.trim()) {
      results.value = []
      isSearching.value = false
      return
    }

    isSearching.value = true
    try {
      const matches = await searchNotes(props.files, props.readFile, value)
      results.value = matches.map((match) => ({
        filepath: match.filepath,
        preview: match.preview,
        lastModified: props.dates[match.filepath],
      }))
    } finally {
      isSearching.value = false
    }
  },
  { immediate: true },
)

const emptyMessage = computed(() =>
  debouncedQuery.value.trim() ? 'No matching notes.' : 'Search titles and content.',
)

onMounted(() => input.value?.focus())
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <label
      class="mx-3 mt-3 flex h-10 items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 shadow-xs focus-within:ring-2 focus-within:ring-ring/40 md:mt-0"
    >
      <Search class="size-4 shrink-0 text-neutral-400" />
      <input
        ref="input"
        v-model="query"
        type="search"
        placeholder="Search notes"
        class="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400"
      >
    </label>
    <p
      v-if="debouncedQuery.trim() && !isSearching && results.length"
      class="px-4 pt-3 text-[11px] font-medium tracking-wide text-neutral-400 uppercase"
    >
      {{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}
    </p>
    <NotePreviewList
      layout="list"
      :items="results"
      :selected-file="selectedFile"
      :is-loading="isSearching"
      :highlight="debouncedQuery"
      :empty-message="emptyMessage"
      @select="emit('select', $event)"
    />
  </div>
</template>
