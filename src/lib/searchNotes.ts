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

function snippetAroundMatch(content: string, query: string, radius = 30): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerContent.indexOf(lowerQuery)
  if (idx === -1) return previewFromContent(content)

  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + query.length + radius)
  let snippet = content.slice(start, end).replace(/\r\n/g, '\n').replace(/\n/g, '|')

  if (start > 0) snippet = `…${snippet}`
  if (end < content.length) snippet = `${snippet}…`

  return snippet.trim()
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

      const preview =
        contentMatches > 0
          ? snippetAroundMatch(content, normalizedQuery)
          : previewFromContent(content)

      return { filepath, matchCount, preview }
    }),
  )

  return results
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.matchCount - a.matchCount || a.filepath.localeCompare(b.filepath))
}
