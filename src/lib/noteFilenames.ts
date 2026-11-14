import { noteBasename } from '@/lib/noteDisplay'
import { assertSafeFolderPath, assertSafeRelativePath, noteParentFolder } from '@/lib/noteFolders'

export const QUICK_NOTES_DIR = 'quick_notes'

export type NoteKind = 'markdown' | 'canvas'

type NoteExtension = '.md' | '.pdf' | '.canvas'

const KIND_EXTENSIONS: Record<NoteKind, NoteExtension> = {
  markdown: '.md',
  canvas: '.canvas',
}

function hasExtension(name: string, ext: NoteExtension): boolean {
  return ext === '.md' ? name.endsWith(ext) : name.toLowerCase().endsWith(ext)
}

function normalizeNoteFilename(name: string, ext: NoteExtension): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Filename is required')
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Filename must not contain path separators')
  }
  return hasExtension(trimmed, ext) ? trimmed : `${trimmed}${ext}`
}

export function normalizeMarkdownFilename(name: string): string {
  return normalizeNoteFilename(name, '.md')
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

export function generateIsoDateFilename(now = new Date(), ext: string = '.md'): string {
  const y = now.getFullYear()
  const m = padTwo(now.getMonth() + 1)
  const d = padTwo(now.getDate())
  const h = padTwo(now.getHours())
  const min = padTwo(now.getMinutes())
  const s = padTwo(now.getSeconds())
  return `${y}-${m}-${d}T${h}-${min}-${s}${ext}`
}

export function uniqueIsoDateFilename(
  existingFiles: Iterable<string>,
  now = new Date(),
  ext: string = '.md',
): string {
  const existing = new Set(existingFiles)
  const base = generateIsoDateFilename(now, ext)
  if (!existing.has(base)) return base

  const stem = base.slice(0, -ext.length)
  let suffix = 2
  while (true) {
    const candidate = `${stem}-${suffix}${ext}`
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
  /** Defaults to markdown. */
  kind?: NoteKind
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

function noteExtension(filepath: string): NoteExtension {
  const lower = filepath.toLowerCase()
  if (lower.endsWith('.pdf')) return '.pdf'
  if (lower.endsWith('.canvas')) return '.canvas'
  return '.md'
}

export function resolveNewNoteFilename(
  options: ResolveNewNoteOptions | undefined,
  existingFiles: string[],
): string {
  const folder = assertSafeFolderPath(options?.folder ?? '')
  const trimmed = options?.name?.trim() ?? ''
  const ext = KIND_EXTENSIONS[options?.kind ?? 'markdown']

  if (!trimmed) {
    const targetFolder = folder || QUICK_NOTES_DIR
    const basename = uniqueIsoDateFilename(
      existingBasenamesInFolder(existingFiles, targetFolder),
      new Date(),
      ext,
    )
    return joinFolderPath(targetFolder, basename)
  }

  const namePath = assertSafeRelativePath(trimmed)
  const slash = namePath.lastIndexOf('/')
  const extraFolders = slash === -1 ? '' : namePath.slice(0, slash)
  const basename = normalizeNoteFilename(slash === -1 ? namePath : namePath.slice(slash + 1), ext)
  const targetFolder = [folder, extraFolders].filter(Boolean).join('/')
  return joinFolderPath(targetFolder, basename)
}

function uniqueBasenameInFolder(basename: string, existingBasenames: string[]): string {
  if (!existingBasenames.includes(basename)) return basename

  const ext = noteExtension(basename)
  const stem = hasExtension(basename, ext) ? basename.slice(0, -ext.length) : basename
  let suffix = 2
  while (true) {
    const candidate = `${stem}-${suffix}${ext}`
    if (!existingBasenames.includes(candidate)) return candidate
    suffix++
  }
}

/** Target path when moving a note into `targetFolder` (empty = root / quick note rules). */
export function resolveMoveNotePath(
  sourcePath: string,
  targetFolder: string,
  existingFiles: string[],
): string {
  const folder = assertSafeFolderPath(targetFolder)

  const basename = noteBasename(sourcePath)
  const targetPath = folder ? joinFolderPath(folder, basename) : basename

  const others = existingFiles.filter((path) => path !== sourcePath)
  if (!others.includes(targetPath)) return targetPath

  const uniqueBasename = uniqueBasenameInFolder(basename, existingBasenamesInFolder(others, folder))

  return folder ? joinFolderPath(folder, uniqueBasename) : uniqueBasename
}

/** New path when renaming a note in place. `newStem` is the title without a folder. */
export function resolveRenameNotePath(
  sourcePath: string,
  newStem: string,
  existingFiles: string[],
): string {
  const stem = newStem.trim()
  if (!stem) throw new Error('Filename is required')
  if (stem.includes('/') || stem.includes('\\')) {
    throw new Error('Filename must not contain path separators')
  }
  if (stem === '.' || stem === '..') {
    throw new Error('Path contains an invalid segment')
  }

  const ext = noteExtension(sourcePath)
  const filename = hasExtension(stem, ext) ? stem : `${stem}${ext}`
  const target = joinFolderPath(noteParentFolder(sourcePath), filename)
  if (target !== sourcePath && existingFiles.includes(target)) {
    throw new Error('File already exists')
  }
  return target
}
