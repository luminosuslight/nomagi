/** Select value: named notes at repo root; untitled quick notes in quick_notes. */
export const ROOT_FOLDER_VALUE = ''

export const ROOT_FOLDER_LABEL = 'No Folder / Quick Note'

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
