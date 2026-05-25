import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useGit } from './useGit'
import { errorMessage, reportError } from '@/lib/errors'

const COMMIT_DEBOUNCE_MS = 500

/**
 * Commit strategy: debounce edits (500ms), then write + commit if dirty.
 * Commits within 1 min of the last (unpushed) commit amend it instead of
 * creating a new one. flush() cancels the timer and commits immediately —
 * used when switching files or hiding the tab.
 */
export function useNotes() {
  const git = useGit()
  const files = ref<string[]>([])
  const selectedFile = ref<string | null>(null)
  const content = ref('')
  const isLoadingFiles = ref(false)
  const isLoadingContent = ref(false)
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let skipSave = false
  let lastPersistedContent = ''

  function clearSaveTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  function isDirty(): boolean {
    return !skipSave && selectedFile.value !== null && content.value !== lastPersistedContent
  }

  async function persistIfDirty() {
    if (!isDirty()) return

    isSaving.value = true
    saveError.value = null

    try {
      await git.writeFile(selectedFile.value!, content.value)
      lastPersistedContent = content.value
    } catch (err) {
      reportError('save', err)
      saveError.value = errorMessage(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function flush() {
    clearSaveTimer()
    await persistIfDirty()
  }

  function scheduleCommit() {
    if (!selectedFile.value || skipSave) return
    clearSaveTimer()
    saveTimer = setTimeout(() => {
      saveTimer = null
      void persistIfDirty().catch((err) => reportError('auto-save', err))
    }, COMMIT_DEBOUNCE_MS)
  }

  async function refreshFiles() {
    if (!git.isCloned.value) {
      files.value = []
      return
    }

    isLoadingFiles.value = true
    try {
      files.value = await git.listMarkdownFiles()
      if (selectedFile.value && !files.value.includes(selectedFile.value)) {
        selectedFile.value = files.value[0] ?? null
      }
      if (!selectedFile.value && files.value.length > 0) {
        selectedFile.value = files.value[0]
      }
    } finally {
      isLoadingFiles.value = false
    }
  }

  async function openFile(filepath: string, prevFilepath: string | null = null) {
    if (prevFilepath && prevFilepath !== filepath) {
      clearSaveTimer()
      if (!skipSave && content.value !== lastPersistedContent) {
        isSaving.value = true
        saveError.value = null
        try {
          await git.writeFile(prevFilepath, content.value)
        } catch (err) {
          reportError('save', err)
          saveError.value = errorMessage(err)
          throw err
        } finally {
          isSaving.value = false
        }
      }
    }

    isLoadingContent.value = true
    saveError.value = null
    skipSave = true

    try {
      content.value = await git.readFile(filepath)
      lastPersistedContent = content.value
    } catch (err) {
      reportError('readFile', err)
      saveError.value = errorMessage(err)
      content.value = ''
      lastPersistedContent = ''
    } finally {
      isLoadingContent.value = false
      skipSave = false
    }
  }

  watch(content, () => {
    scheduleCommit()
  })

  watch(selectedFile, (filepath, prevFilepath) => {
    if (filepath) void openFile(filepath, prevFilepath ?? null)
  })

  async function createFile(name: string) {
    const filename = await git.createFile(name, '')
    await refreshFiles()
    selectedFile.value = filename
    return filename
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      void flush().catch((err) => reportError('flush', err))
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    clearSaveTimer()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    ...git,
    files,
    selectedFile,
    content,
    isLoadingFiles,
    isLoadingContent,
    isSaving,
    saveError,
    refreshFiles,
    selectFile: openFile,
    flush,
    createFile,
  }
}
