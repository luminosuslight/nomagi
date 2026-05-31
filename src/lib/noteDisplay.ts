const ISO_DATE_FILENAME = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?\.md$/

/** Markdown list marker: dash, asterisk, or plus. */
const LIST_MARKER = '(?:[-*+])'

export function isIsoDateFilename(name: string): boolean {
  return ISO_DATE_FILENAME.test(name)
}

export function displayFilename(filepath: string): string | null {
  if (isIsoDateFilename(filepath)) return null
  return filepath.endsWith('.md') ? filepath.slice(0, -3) : filepath
}

export function listDisplayName(filepath: string): string {
  const named = displayFilename(filepath)
  if (named) return named
  return filepath.endsWith('.md') ? filepath.slice(0, -3) : filepath
}

function stripHtmlForPreview(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/<[^>]+\/>/g, '')
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<[^>]+>/g, '')
}

function stripBlockMarkdownForPreview(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/^\s*>\s*/, '')
    .replace(new RegExp(`^\\s*${LIST_MARKER}\\s+\\[\\s*\\]\\s+`), '☐ ')
    .replace(new RegExp(`^\\s*${LIST_MARKER}\\s+\\[[xX]\\]\\s+`), '☑ ')
    .replace(new RegExp(`^\\s*${LIST_MARKER}\\s+`), '• ')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/\s+$/, '')
}

function stripInlineMarkdownForPreview(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

export function stripMarkdownForPreview(text: string): string {
  const lines = stripHtmlForPreview(text)
    .split('\n')
    .map((line) => stripInlineMarkdownForPreview(stripBlockMarkdownForPreview(line)))
    .filter((line) => line.length > 0)

  return lines.join('\n').trim()
}

export function previewFromContent(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n')
  const fiveLines = normalized.split('\n').slice(0, 5).join('\n')
  const oneFifty = normalized.slice(0, 150)
  const excerpt = fiveLines.length <= oneFifty.length ? fiveLines : oneFifty
  const plain = stripMarkdownForPreview(excerpt).trim()

  return plain || 'Empty note'
}
