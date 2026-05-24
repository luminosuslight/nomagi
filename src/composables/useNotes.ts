import { ref, watch } from 'vue'
import { useGit } from './useGit'
import { errorMessage, reportError } from '@/lib/errors'

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

  async function selectFile(filepath: string) {
    selectedFile.value = filepath
    isLoadingContent.value = true
    saveError.value = null
    skipSave = true

    try {
      content.value = await git.readFile(filepath)
    } catch (err) {
      reportError('readFile', err)
      saveError.value = errorMessage(err)
      content.value = ''
    } finally {
      isLoadingContent.value = false
      skipSave = false
    }
  }

  async function saveNow() {
    if (!selectedFile.value || skipSave) return

    isSaving.value = true
    saveError.value = null

    try {
      await git.writeFile(selectedFile.value, content.value)
    } catch (err) {
      reportError('save', err)
      saveError.value = errorMessage(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function scheduleSave() {
    if (!selectedFile.value || skipSave) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void saveNow().catch((err) => reportError('auto-save', err))
    }, 500)
  }

  watch(content, () => {
    scheduleSave()
  })

  watch(selectedFile, (filepath) => {
    if (filepath) void selectFile(filepath)
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
    selectFile,
    saveNow,
  }
}
