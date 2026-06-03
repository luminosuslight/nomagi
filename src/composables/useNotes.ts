import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGit } from './useGit'
import { errorMessage, reportError } from '@/lib/errors'
import { previewFromContent } from '@/lib/noteDisplay'
import type { RecentNote } from './useGit'

type RecentNoteWithPreview = RecentNote & { preview: string }

const COMMIT_DEBOUNCE_MS = 500
/** Auto-sync is deferred while the user edited within this window. */
const SYNC_SKIP_EDIT_MS = 2_000

/**
 * Commit/sync orchestration (see useGit.ts for amend + push tracking).
 *
 * Commit: debounce (COMMIT_DEBOUNCE_MS) → persistIfDirty → writeFile + commit.
 * Amend within COMMIT_AMEND_WINDOW_MS if HEAD is unpushed (useGit).
 * flush() on file switch / tab hide; openFile commits previous file when switching
 * (only if userEdited — Milkdown normalization alone does not count).
 *
 * Sync: push first; fetch + merge only when push is rejected (non-fast-forward).
 * On file leave (switch / mobile back) queues background sync when there were
 * local edits or unpushed commits; syncNotes for manual / mount / reconnect.
 * Manual sync always runs. Reload open file only if !isDirty() after sync.
 * Merge conflicts in notes keep both sides (see notesMergeDriver).
 */
export function useNotes() {
  const git = useGit()
  const files = ref<string[]>([])
  const recentNotes = ref<RecentNoteWithPreview[]>([])
  const selectedFile = ref<string | null>(null)
  const content = ref('')
  const isLoadingFiles = ref(false)
  const isLoadingContent = ref(false)
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let skipSave = false
  /** True after the user edits the open note (not Milkdown parse/normalize on load). */
  let userEdited = false
  const lastPersistedContent = ref('')
  let lastEditAt = 0
  let backgroundSyncChain: Promise<void> = Promise.resolve()
  const hasUnsyncedChanges = computed(() => git.hasUnpushedCommits.value)

  function clearSaveTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  function isDirty(): boolean {
    return (
      userEdited &&
      !skipSave &&
      selectedFile.value !== null &&
      content.value !== lastPersistedContent.value
    )
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

  async function syncAfterLocalChanges(options: { reload?: boolean } = {}) {
    if (!git.isCloned.value || !navigator.onLine) return

    await git.sync()
    await refreshFiles({ silent: true })
    if (options.reload !== false) {
      await reloadCurrentFileIfClean()
    }
  }

  function queueBackgroundSync(options: { reload?: boolean } = {}) {
    backgroundSyncChain = backgroundSyncChain
      .then(() => syncAfterLocalChanges(options))
      .catch((err) => reportError('sync', err))
  }

  async function syncNotes(options: { auto?: boolean } = {}): Promise<{ skipped?: boolean }> {
    if (!git.isCloned.value || !navigator.onLine) return { skipped: true }
    if (options.auto && isEditingActive()) return { skipped: true }

    await flush()
    await syncAfterLocalChanges()
    return {}
  }

  /** Flush the open file and push when the user edited or has unpushed commits. */
  async function leaveCurrentFile() {
    const hadUnsavedEdits = isDirty()
    await flush()
    if (!hadUnsavedEdits && !git.hasUnpushedCommits.value) return
    queueBackgroundSync({ reload: false })
  }

  async function refreshRecentNotes() {
    if (!git.isCloned.value) {
      recentNotes.value = []
      return
    }

    const existing = new Set(await git.listMarkdownFiles())
    const byRecent = await git.listRecentNotes()
    recentNotes.value = await Promise.all(
      byRecent
        .filter((note) => existing.has(note.filepath))
        .map(async (note) => {
          try {
            const text = await git.readFile(note.filepath)
            return { ...note, preview: previewFromContent(text) }
          } catch {
            return { ...note, preview: 'Empty note' }
          }
        }),
    )
  }

  async function refreshFiles(options: { silent?: boolean } = {}) {
    if (!git.isCloned.value) {
      files.value = []
      recentNotes.value = []
      return
    }

    const showLoading = !options.silent && files.value.length === 0
    if (showLoading) isLoadingFiles.value = true
    try {
      files.value = await git.listMarkdownFiles()
      await refreshRecentNotes()
      if (selectedFile.value && !files.value.includes(selectedFile.value)) {
        selectedFile.value = null
      }
    } finally {
      if (showLoading) isLoadingFiles.value = false
    }
  }

  git.onAfterCommit(() => {
    void refreshRecentNotes().catch((err) => reportError('refreshRecent', err))
  })

  async function openFile(filepath: string, prevFilepath: string | null = null) {
    const leavingFile = Boolean(prevFilepath && prevFilepath !== filepath)

    if (leavingFile && !userEdited && content.value !== lastPersistedContent.value) {
      content.value = lastPersistedContent.value
    }

    const hadUnsavedEdits =
      leavingFile && userEdited && !skipSave && content.value !== lastPersistedContent.value

    if (leavingFile) {
      clearSaveTimer()
      if (hadUnsavedEdits) {
        isSaving.value = true
        saveError.value = null
        try {
          await git.writeFile(prevFilepath!, content.value)
          lastPersistedContent.value = content.value
        } catch (err) {
          reportError('save', err)
          saveError.value = errorMessage(err)
          throw err
        } finally {
          isSaving.value = false
        }
      }

      if (hadUnsavedEdits || git.hasUnpushedCommits.value) {
        queueBackgroundSync({ reload: false })
      }
    }

    userEdited = false
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
    if (skipSave || isLoadingContent.value) return
    userEdited = true
    lastEditAt = Date.now()
    scheduleCommit()
  })

  watch(selectedFile, (filepath, prevFilepath) => {
    if (filepath) void openFile(filepath, prevFilepath ?? null)
  })

  async function createFile(options?: { name?: string; folder?: string }) {
    const filename = await git.createFile(options, '')
    files.value = await git.listMarkdownFiles()
    selectedFile.value = filename
    return filename
  }

  async function deleteFile(filepath: string) {
    if (selectedFile.value === filepath) {
      clearSaveTimer()
      userEdited = false
      skipSave = true
      selectedFile.value = null
      content.value = ''
      lastPersistedContent.value = ''
      skipSave = false
    }

    try {
      await git.deleteFile(filepath)
    } finally {
      await refreshFiles({ silent: true })
    }
    queueBackgroundSync({ reload: false })
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
    saveError,
    hasUnsyncedChanges,
    refreshFiles,
    selectFile: openFile,
    flush,
    leaveCurrentFile,
    syncNotes,
    createFile,
    deleteFile,
  }
}
