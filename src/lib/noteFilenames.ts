export const QUICK_NOTES_DIR = 'quick_notes'

export function normalizeMarkdownFilename(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Filename is required')
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Filename must not contain path separators')
  }
  return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

export function generateIsoDateFilename(now = new Date()): string {
  const y = now.getFullYear()
  const m = padTwo(now.getMonth() + 1)
  const d = padTwo(now.getDate())
  const h = padTwo(now.getHours())
  const min = padTwo(now.getMinutes())
  const s = padTwo(now.getSeconds())
  return `${y}-${m}-${d}T${h}-${min}-${s}.md`
}

export function uniqueIsoDateFilename(existingFiles: Iterable<string>, now = new Date()): string {
  const existing = new Set(existingFiles)
  const base = generateIsoDateFilename(now)
  if (!existing.has(base)) return base

  let suffix = 2
  while (true) {
    const candidate = base.replace(/\.md$/, `-${suffix}.md`)
    if (!existing.has(candidate)) return candidate
    suffix++
  }
}

export type ResolveNewNoteOptions = {
  name?: string
  /**
   * Empty string = "No Folder / Quick Note": named notes at repo root,
   * untitled ISO notes in quick_notes.
   */
  folder?: string
}

function existingBasenamesInFolder(existingFiles: string[], folder: string): string[] {
  if (!folder) {
    return existingFiles.filter((path) => !path.includes('/'))
  }
  const prefix = `${folder}/`
  return existingFiles
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
}

function joinFolderPath(folder: string, filename: string): string {
  return folder ? `${folder}/${filename}` : filename
}

export function resolveNewNoteFilename(
  options: ResolveNewNoteOptions | undefined,
  existingFiles: string[],
): string {
  const folder = options?.folder?.trim() ?? ''
  const trimmed = options?.name?.trim() ?? ''

  if (folder.includes('/') || folder.includes('\\')) {
    throw new Error('Folder must not contain path separators')
  }

  if (!trimmed) {
    const targetFolder = folder || QUICK_NOTES_DIR
    const basename = uniqueIsoDateFilename(existingBasenamesInFolder(existingFiles, targetFolder))
    return joinFolderPath(targetFolder, basename)
  }

  if (!folder) {
    return normalizeMarkdownFilename(trimmed)
  }

  return joinFolderPath(folder, normalizeMarkdownFilename(trimmed))
}
