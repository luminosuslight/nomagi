import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGit } from './useGit'
import { errorMessage, reportError } from '@/lib/errors'

const COMMIT_DEBOUNCE_MS = 500
/** Auto-sync is deferred while the user edited within this window. */
const SYNC_SKIP_EDIT_MS = 2_000

/**
 * Commit/sync orchestration (see useGit.ts for amend + push tracking).
 *
 * Commit: debounce (COMMIT_DEBOUNCE_MS) → persistIfDirty → writeFile + commit.
 * Amend within COMMIT_AMEND_WINDOW_MS if HEAD is unpushed (useGit).
 * flush() on file switch / tab hide; openFile commits previous file when switching.
 *
 * Sync: syncNotes({ auto }) — auto skips if isEditingActive() (SYNC_SKIP_EDIT_MS).
 * Manual sync always runs. Reload open file only if !isDirty() after sync.
 * Merge conflicts in notes keep both sides (see notesMergeDriver).
 */
export function useNotes() {
  const git = useGit()
  const files = ref<string[]>([])
  const recentNotes = ref<{ filepath: string; lastModified: number }[]>([])
  const selectedFile = ref<string | null>(null)
  const content = ref('')
  const isLoadingFiles = ref(false)
  const isLoadingContent = ref(false)
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let skipSave = false
  const lastPersistedContent = ref('')
  let lastEditAt = 0
  const hasUnsyncedChanges = computed(() => git.hasUnpushedCommits.value)

  function clearSaveTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  function isDirty(): boolean {
    return !skipSave && selectedFile.value !== null && content.value !== lastPersistedContent.value
  }

  function isEditingActive(): boolean {
    if (isSaving.value) return true
    if (saveTimer !== null) return true
    if (lastEditAt > 0 && Date.now() - lastEditAt < SYNC_SKIP_EDIT_MS) return true
    return false
  }

  async function persistIfDirty() {
    if (!isDirty()) return

    isSaving.value = true
    saveError.value = null

    try {
      await git.writeFile(selectedFile.value!, content.value)
      lastPersistedContent.value = content.value
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

  async function reloadCurrentFileIfClean() {
    if (!selectedFile.value || isDirty()) return

    skipSave = true
    try {
      content.value = await git.readFile(selectedFile.value)
      lastPersistedContent.value = content.value
    } catch (err) {
      reportError('readFile', err)
      saveError.value = errorMessage(err)
    } finally {
      skipSave = false
    }
  }

  async function syncNotes(options: { auto?: boolean } = {}): Promise<{ skipped?: boolean }> {
    if (!git.isCloned.value || !navigator.onLine) return { skipped: true }
    if (options.auto && isEditingActive()) return { skipped: true }

    await flush()
    await git.sync()
    await refreshFiles()
    await reloadCurrentFileIfClean()
    return {}
  }

  async function refreshFiles() {
    if (!git.isCloned.value) {
      files.value = []
      recentNotes.value = []
      return
    }

    isLoadingFiles.value = true
    try {
      const [allFiles, byRecent] = await Promise.all([
        git.listMarkdownFiles(),
        git.listRecentNotes(),
      ])
      files.value = allFiles
      recentNotes.value = byRecent
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
      if (!skipSave && content.value !== lastPersistedContent.value) {
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
      lastPersistedContent.value = content.value
    } catch (err) {
      reportError('readFile', err)
      saveError.value = errorMessage(err)
      content.value = ''
      lastPersistedContent.value = ''
    } finally {
      isLoadingContent.value = false
      skipSave = false
    }
  }

  watch(content, () => {
    lastEditAt = Date.now()
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
    recentNotes,
    selectedFile,
    content,
    isLoadingFiles,
    isLoadingContent,
    isSaving,
    saveError,
    hasUnsyncedChanges,
    refreshFiles,
    selectFile: openFile,
    flush,
    syncNotes,
    createFile,
  }
}
