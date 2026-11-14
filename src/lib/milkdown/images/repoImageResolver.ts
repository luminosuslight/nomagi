import { imageMimeType, resolveRepoImagePath } from '@/lib/milkdown/images/imageUrls'

export interface RepoImageResolver {
  /** Maps a markdown image src to a URL the browser can load (blob URL for repo files). */
  resolve: (src: string) => Promise<string> | string
  dispose: () => void
}

/**
 * Repo files live in browser storage, so relative image paths are read from there and
 * served as blob URLs. Unresolvable sources are returned unchanged.
 */
export function createRepoImageResolver(
  noteFilepath: () => string | null,
  readFileBinary: (filepath: string) => Promise<Uint8Array>,
): RepoImageResolver {
  const cache = new Map<string, Promise<string>>()
  const objectUrls: string[] = []
  let disposed = false

  function resolve(src: string): Promise<string> | string {
    const note = noteFilepath()
    if (!note) return src
    const path = resolveRepoImagePath(note, src)
    if (!path) return src

    let pending = cache.get(path)
    if (!pending) {
      pending = readFileBinary(path).then(
        (bytes) => {
          if (disposed) return src
          const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
            type: imageMimeType(path) ?? '',
          })
          const url = URL.createObjectURL(blob)
          objectUrls.push(url)
          return url
        },
        () => {
          cache.delete(path)
          return src
        },
      )
      cache.set(path, pending)
    }
    return pending
  }

  function dispose() {
    disposed = true
    for (const url of objectUrls) URL.revokeObjectURL(url)
    objectUrls.length = 0
    cache.clear()
  }

  return { resolve, dispose }
}
