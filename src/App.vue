<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { errorMessage, reportError } from '@/lib/errors'
import { FileText, Pencil, Plus, Settings } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button.vue'
import Separator from '@/components/ui/Separator.vue'
import FileList from '@/components/FileList.vue'
import Editor from '@/components/Editor.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import SyncButton from '@/components/SyncButton.vue'
import { Toaster } from 'vue-sonner'
import { useNotes } from '@/composables/useNotes'
import type { GitSettings } from '@/composables/useGit'

type MobileView = 'files' | 'editor'

const {
  settings,
  isCloned,
  syncStatus,
  isBusy,
  files,
  selectedFile,
  content,
  isLoadingFiles,
  isLoadingContent,
  isSaving,
  checkCloned,
  updateSettings,
  clone,
  sync,
  refreshFiles,
  selectFile: loadFile,
  createFile,
} = useNotes()

const settingsOpen = ref(false)
const mobileView = ref<MobileView>('files')
const isOnline = ref(navigator.onLine)

let syncInterval: ReturnType<typeof setInterval> | null = null

async function handleClone(next: GitSettings) {
  try {
    updateSettings(next)
    await clone()
    await refreshFiles()
    settingsOpen.value = false
    toast.success('Repository cloned')
  } catch (err) {
    reportError('clone', err)
    toast.error(errorMessage(err))
  }
}

async function handleSync() {
  try {
    await sync()
    await refreshFiles()
    if (selectedFile.value) {
      await loadFile(selectedFile.value)
    }
    toast.success('Synced with remote')
  } catch (err) {
    reportError('sync', err)
    toast.error(errorMessage(err))
  }
}

function selectFile(file: string) {
  selectedFile.value = file
  mobileView.value = 'editor'
}

async function handleNewFile() {
  const name = window.prompt('New note filename', 'untitled.md')
  if (!name) return

  try {
    const filename = await createFile(name)
    mobileView.value = 'editor'
    toast.success(`Created ${filename}`)
  } catch (err) {
    reportError('createFile', err)
    toast.error(errorMessage(err))
  }
}

function handleOnline() {
  isOnline.value = true
  void handleSync()
}

function handleOffline() {
  isOnline.value = false
}

onMounted(async () => {
  await checkCloned()
  if (isCloned.value) {
    await refreshFiles()
  } else {
    settingsOpen.value = true
  }

  syncInterval = setInterval(() => {
    if (navigator.onLine) void handleSync()
  }, 60_000)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <div class="flex h-dvh flex-col md:flex-row pb-14 md:pb-0">
    <aside
      :class="
        cn(
          'flex w-full min-h-0 flex-1 flex-col border-r md:w-72 md:flex-none md:min-h-dvh',
          mobileView !== 'files' && 'hidden md:flex',
        )
      "
    >
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-base font-semibold">
          Git Notes
        </h1>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          @click="settingsOpen = true"
        >
          <Settings class="size-4" />
        </Button>
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
      <FileList
        :files="files"
        :selected-file="selectedFile"
        :is-loading="isLoadingFiles"
        @select="selectFile"
      />
      <div class="mt-auto border-t p-3">
        <SyncButton
          :sync-status="syncStatus"
          :is-busy="isBusy"
          :is-online="isOnline"
          @sync="handleSync"
        />
      </div>
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
        :is-saving="isSaving"
      />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
      <button
        type="button"
        :class="
          cn(
            'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
            mobileView === 'files' ? 'text-foreground' : 'text-muted-foreground',
          )
        "
        @click="mobileView = 'files'"
      >
        <FileText class="size-5" />
        Files
      </button>
      <button
        type="button"
        :class="
          cn(
            'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
            mobileView === 'editor' ? 'text-foreground' : 'text-muted-foreground',
          )
        "
        @click="mobileView = 'editor'"
      >
        <Pencil class="size-5" />
        Editor
      </button>
    </nav>

    <SettingsDialog
      v-model="settingsOpen"
      :settings="settings"
      :is-cloned="isCloned"
      :is-busy="isBusy"
      @save="updateSettings"
      @clone="handleClone"
    />

    <Toaster
      position="top-center"
      rich-colors
    />
  </div>
</template>
