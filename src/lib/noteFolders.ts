/** Select value: named notes at repo root; untitled quick notes in quick_notes. */
export const ROOT_FOLDER_VALUE = ''

export const ROOT_FOLDER_LABEL = 'No Folder / Quick Note'

/** Parent folder path, or empty string for notes at the repo root. */
export function noteParentFolder(filepath: string): string {
  const slash = filepath.lastIndexOf('/')
  return slash === -1 ? '' : filepath.slice(0, slash)
}

/** Folder paths from the repo root down to the parent of `filepath`. */
export function ancestorFolderPaths(filepath: string): string[] {
  const parent = noteParentFolder(filepath)
  if (!parent) return []
  const parts = parent.split('/')
  const paths: string[] = []
  for (let i = 1; i <= parts.length; i++) {
    paths.push(parts.slice(0, i).join('/'))
  }
  return paths
}

/** Non-empty relative path: no backslashes, `.`, `..`, or empty segments. */
export function assertSafeRelativePath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) throw new Error('Path is required')
  if (trimmed.includes('\\')) throw new Error('Path must not contain backslashes')
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    throw new Error('Path must not start or end with a slash')
  }
  for (const segment of trimmed.split('/')) {
    if (!segment || segment === '.' || segment === '..') {
      throw new Error('Path contains an invalid segment')
    }
  }
  return trimmed
}

/** Empty string is the repo root. Otherwise the same rules as `assertSafeRelativePath`. */
export function assertSafeFolderPath(folder: string): string {
  const trimmed = folder.trim()
  if (!trimmed) return ''
  return assertSafeRelativePath(trimmed)
}

/** Folder path from a parent (empty = repo root) and a name that may itself contain `/`. */
export function resolveNewFolderPath(name: string, parentFolder = ''): string {
  const parent = assertSafeFolderPath(parentFolder)
  const child = assertSafeRelativePath(name)
  return parent ? `${parent}/${child}` : child
}

export function listFoldersFromFiles(files: string[]): string[] {
  const folders = new Set<string>()

  for (const path of files) {
    const parts = path.split('/')
    if (parts.length < 2) continue
    parts.pop()
    for (let i = 1; i <= parts.length; i++) {
      folders.add(parts.slice(0, i).join('/'))
    }
  }

  return [...folders].sort((a, b) => a.localeCompare(b))
}
