import { previewFromContent } from '@/lib/noteDisplay'

export type SearchResult = {
  filepath: string
  matchCount: number
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
      const content = await readFile(filepath)
      const contentMatches = countOccurrences(content, normalizedQuery)
      const filenameMatches = filepath.toLowerCase().includes(lowerQuery) ? 1 : 0
      const matchCount = contentMatches + filenameMatches

      if (matchCount === 0) return null

      return { filepath, matchCount, preview: previewFromContent(content) }
    }),
  )

  return results
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.matchCount - a.matchCount || a.filepath.localeCompare(b.filepath))
}
