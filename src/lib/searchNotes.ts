import { matchPreview, previewFromContent } from '@/lib/noteDisplay'
import { canvasPlainTextFromContent, canvasPreviewFromContent } from '@/lib/canvas/jsonCanvas'
import { isCanvasFile, isPdfFile } from '@/lib/fileTypes'

export type SearchResult = {
  filepath: string
  matchCount: number
  /** Matching lines, or the regular note preview when only the filename matched. */
  preview: string
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0

  const lowerHay = haystack.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  let count = 0
  let pos = 0

  while (true) {
    const idx = lowerHay.indexOf(lowerNeedle, pos)
    if (idx === -1) break
    count++
    pos = idx + lowerNeedle.length
  }

  return count
}

export async function searchNotes(
  files: string[],
  readFile: (path: string) => Promise<string>,
  query: string,
): Promise<SearchResult[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []

  const lowerQuery = normalizedQuery.toLowerCase()
  const results = await Promise.all(
    files.map(async (filepath) => {
      if (isPdfFile(filepath)) {
        const filenameMatches = filepath.toLowerCase().includes(lowerQuery) ? 1 : 0
        if (filenameMatches === 0) return null
        return { filepath, matchCount: filenameMatches, preview: 'PDF' }
      }

      const raw = await readFile(filepath)
      const content = isCanvasFile(filepath) ? canvasPlainTextFromContent(raw) : raw
      const contentMatches = countOccurrences(content, normalizedQuery)
      const filenameMatches = filepath.toLowerCase().includes(lowerQuery) ? 1 : 0
      const matchCount = contentMatches + filenameMatches

      if (matchCount === 0) return null

      const preview =
        matchPreview(content, normalizedQuery) ??
        (isCanvasFile(filepath) ? canvasPreviewFromContent(raw) : previewFromContent(content))
      return { filepath, matchCount, preview }
    }),
  )

  return results
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.matchCount - a.matchCount || a.filepath.localeCompare(b.filepath))
}
