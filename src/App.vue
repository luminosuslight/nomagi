<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  hasStoragePersistenceApi,
  shouldShowPersistDeniedToast,
  shouldShowQuotaWarningToast,
  type StorageSetupResult,
} from '@/lib/browserStorage'
import { errorMessage, reportError } from '@/lib/errors'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { Plus, Settings } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'
import Separator from '@/components/ui/Separator.vue'
import FileList from '@/components/FileList.vue'
import NotePreviewList from '@/components/NotePreviewList.vue'
import SearchNotesPanel from '@/components/SearchNotesPanel.vue'
import SidebarViewTabs, { type SidebarView } from '@/components/SidebarViewTabs.vue'
import Editor from '@/components/Editor.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import SyncButton from '@/components/SyncButton.vue'
import { Toaster } from '@/components/ui/sonner'
import { useNotes } from '@/composables/useNotes'
type MobileView = 'files' | 'editor'

const {
  settings,
  isCloned,
  syncStatus,
  isBusy,
  files,
  recentNotes,
  selectedFile,
  content,
  isLoadingFiles,
  isLoadingContent,
  hasUnsyncedChanges,
  checkCloned,
  setupBrowserStorage,
  updateSettings,
  resetApp,
  clone,
  syncNotes,
  leaveCurrentFile,
  refreshFiles,
  createFile,
  readFile,
} = useNotes()

const settingsOpen = ref(false)
const sidebarView = ref<SidebarView>('recent')
const mobileView = ref<MobileView>('files')
const isOnline = ref(navigator.onLine)

const recentPreviewItems = computed(() =>
  recentNotes.value.map((note) => ({
    filepath: note.filepath,
    preview: note.preview,
    subtitle: formatRelativeTime(note.lastModified),
  })),
)

async function handleClone() {
  try {
    await clone()
    await refreshFiles()
    notifyStorageSetup(await setupBrowserStorage())
    settingsOpen.value = false
    toast.success('Repository cloned')
  } catch (err) {
    reportError('clone', err)
    toast.error(errorMessage(err))
  }
}

async function handleReset() {
  try {
    await resetApp()
    window.location.reload()
  } catch (err) {
    reportError('reset', err)
    toast.error(errorMessage(err))
  }
}

async function handleSync(manual = false) {
  try {
    const result = await syncNotes({ auto: !manual })
    if (result.skipped) return
    if (manual) toast.success('Synced with remote')
  } catch (err) {
    reportError('sync', err)
    toast.error(errorMessage(err))
  }
}

function selectFile(file: string) {
  selectedFile.value = file
  mobileView.value = 'editor'
}

function handleEditorBack() {
  mobileView.value = 'files'
  void leaveCurrentFile().catch((err) => reportError('sync', err))
}

async function handleNewFile() {
  const name = window.prompt('New note filename', '')
  if (name === null) return

  try {
    const filename = await createFile(name.trim() || undefined)
    mobileView.value = 'editor'
    toast.success(`Created ${filename}`)
  } catch (err) {
    reportError('createFile', err)
    toast.error(errorMessage(err))
  }
}

function handleOnline() {
  isOnline.value = true
  void handleSync(false)
}

function handleOffline() {
  isOnline.value = false
}

function notifyStorageSetup(setup: StorageSetupResult) {
  if (
    isCloned.value &&
    hasStoragePersistenceApi() &&
    !setup.persistGranted &&
    shouldShowPersistDeniedToast()
  ) {
    toast.warning(
      'Browser may clear offline notes when storage is low. Allow persistent storage if prompted.',
      { duration: 8000 },
    )
  }
  if (setup.quotaWarning && shouldShowQuotaWarningToast()) {
    toast.warning(setup.quotaWarning, { duration: 10_000 })
  }
}

onMounted(async () => {
  await checkCloned()
  if (isCloned.value) {
    await refreshFiles()
    notifyStorageSetup(await setupBrowserStorage())
    if (navigator.onLine) void handleSync(false)
  } else {
    settingsOpen.value = true
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <div class="flex h-dvh flex-col md:flex-row">
    <aside
      :class="
        cn(
          'flex w-full min-h-0 flex-1 flex-col border-r md:w-72 md:flex-none md:min-h-dvh',
          mobileView !== 'files' && 'hidden md:flex',
        )
      "
    >
      <div class="flex items-center justify-between gap-2 px-4 py-3">
        <h1 class="text-base font-semibold">
          Nomagi
        </h1>
        <div class="flex items-center gap-1">
          <SyncButton
            compact
            :sync-status="syncStatus"
            :is-busy="isBusy"
            :is-online="isOnline"
            :has-unsynced-changes="hasUnsyncedChanges"
            @sync="handleSync(true)"
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            @click="settingsOpen = true"
          >
            <Settings class="size-4" />
          </Button>
        </div>
      </div>
      <Separator />
      <div class="p-3 pb-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-full"
          :disabled="!isCloned || isBusy"
          @click="handleNewFile"
        >
          <Plus class="size-4" />
          New note
        </Button>
      </div>
      <SidebarViewTabs v-model="sidebarView" />
      <FileList
        v-if="sidebarView === 'files'"
        :files="files"
        :selected-file="selectedFile"
        :is-loading="isLoadingFiles"
        @select="selectFile"
      />
      <NotePreviewList
        v-else-if="sidebarView === 'recent'"
        :items="recentPreviewItems"
        :selected-file="selectedFile"
        :is-loading="isLoadingFiles"
        @select="selectFile"
      />
      <SearchNotesPanel
        v-else
        :files="files"
        :read-file="readFile"
        :selected-file="selectedFile"
        @select="selectFile"
      />
    </aside>

    <main
      :class="
        cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          mobileView !== 'editor' && 'hidden md:flex',
        )
      "
    >
      <Editor
        v-model="content"
        :filename="selectedFile"
        :is-loading="isLoadingContent"
        :show-back="mobileView === 'editor'"
        @back="handleEditorBack"
      />
    </main>

    <SettingsDialog
      v-model="settingsOpen"
      :settings="settings"
      :is-cloned="isCloned"
      :is-busy="isBusy"
      @save="updateSettings"
      @clone="handleClone"
      @reset="handleReset"
    />
  </div>

  <Toaster
    position="bottom-center"
    rich-colors
  />
</template>
