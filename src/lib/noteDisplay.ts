const ISO_DATE_FILENAME = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?\.md$/

export function isIsoDateFilename(name: string): boolean {
  return ISO_DATE_FILENAME.test(name)
}

export function displayFilename(filepath: string): string | null {
  if (isIsoDateFilename(filepath)) return null
  return filepath.endsWith('.md') ? filepath.slice(0, -3) : filepath
}

export function previewFromContent(text: string): string {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '|')
    .replace(/^\s*(?:#{1,6}\s+|-+\s*)/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return 'Empty note'

  return normalized.split(' ').filter(Boolean).slice(0, 6).join(' ')
}
