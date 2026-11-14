<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings } from 'lucide-vue-next'
import { canvasPreviewFromContent } from '@/lib/canvas/jsonCanvas'
import { isCanvasFile, isPdfFile } from '@/lib/fileTypes'
import { previewFromContent } from '@/lib/noteDisplay'
import { useMediaQuery } from '@/composables/useMediaQuery'
import FileList from '@/components/FileList.vue'
import NotePreviewList from '@/components/NotePreviewList.vue'
import SearchNotesPanel from '@/components/SearchNotesPanel.vue'
import SidebarNav, { type SidebarView } from '@/components/SidebarNav.vue'
import { mockContents, mockDates, mockFiles } from './mockNotes'

const params = new URLSearchParams(location.search)
const view = ref<SidebarView>((params.get('view') as SidebarView | null) ?? 'recent')
const query = ref(params.get('q') ?? '')
const selectedFile = ref<string | null>(params.get('selected'))
const isWide = useMediaQuery('(min-width: 768px)')

const folders = [
  ...new Set(mockFiles.flatMap((f) => (f.includes('/') ? [f.slice(0, f.lastIndexOf('/'))] : []))),
]

const recentNotes = computed(() =>
  [...mockFiles]
    .sort((a, b) => mockDates[b] - mockDates[a])
    .map((filepath) => {
      const content = mockContents[filepath]
      const preview = isPdfFile(filepath)
        ? 'PDF'
        : isCanvasFile(filepath)
          ? canvasPreviewFromContent(content)
          : previewFromContent(content)
      return { filepath, preview, lastModified: mockDates[filepath] }
    }),
)

async function readFile(filepath: string) {
  return mockContents[filepath] ?? ''
}
</script>

<template>
  <div class="flex h-dvh">
    <aside class="flex min-h-0 w-full flex-1 flex-col border-r bg-neutral-50 md:w-80 md:flex-none">
      <div class="flex h-14 shrink-0 items-center justify-between px-4">
        <h1 class="text-base font-semibold tracking-tight">
          Nomagi
        </h1>
        <Settings class="size-4 text-neutral-500" />
      </div>
      <SidebarNav
        v-model="view"
        can-create-note
      />
      <FileList
        v-if="view === 'files'"
        :files="mockFiles"
        :folders="folders"
        :dates="mockDates"
        :selected-file="selectedFile"
        :is-loading="false"
        @select="selectedFile = $event"
      />
      <NotePreviewList
        v-else-if="view === 'recent'"
        :items="recentNotes"
        :layout="isWide ? 'list' : 'grid'"
        :grouped="isWide"
        :selected-file="selectedFile"
        :is-loading="false"
        @select="selectedFile = $event"
      />
      <SearchNotesPanel
        v-else
        v-model:query="query"
        :files="mockFiles"
        :read-file="readFile"
        :dates="mockDates"
        :selected-file="selectedFile"
        @select="selectedFile = $event"
      />
    </aside>
    <main class="hidden flex-1 items-center justify-center text-sm text-neutral-400 md:flex">
      {{ selectedFile ?? 'No note selected' }}
    </main>
  </div>
</template>
