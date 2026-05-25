<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { searchNotes } from '@/lib/searchNotes'
import Input from '@/components/ui/Input.vue'
import NotePreviewList, { type NotePreviewItem } from '@/components/NotePreviewList.vue'

const props = defineProps<{
  files: string[]
  readFile: (path: string) => Promise<string>
  selectedFile: string | null
}>()

const emit = defineEmits<{
  select: [filepath: string]
}>()

const query = ref('')
const debouncedQuery = ref('')
const results = ref<NotePreviewItem[]>([])
const isSearching = ref(false)

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
        subtitle: `${match.matchCount} match${match.matchCount === 1 ? '' : 'es'}`,
      }))
    } finally {
      isSearching.value = false
    }
  },
  { immediate: true },
)

const emptyMessage = computed(() =>
  debouncedQuery.value.trim() ? 'No matching notes.' : 'Enter a search term.',
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="p-3 pb-0">
      <Input
        v-model="query"
        type="search"
        placeholder="Search notes…"
        class="text-base"
      />
    </div>
    <NotePreviewList
      :items="results"
      :selected-file="selectedFile"
      :is-loading="isSearching"
      :empty-message="emptyMessage"
      @select="emit('select', $event)"
    />
  </div>
</template>
