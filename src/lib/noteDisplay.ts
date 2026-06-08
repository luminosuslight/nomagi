const ISO_DATE_FILENAME = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?\.md$/

/** Markdown list marker: dash, asterisk, or plus. */
const LIST_MARKER = '(?:[-*+])'

export function noteBasename(filepath: string): string {
  const slash = filepath.lastIndexOf('/')
  return slash === -1 ? filepath : filepath.slice(slash + 1)
}

export function isIsoDateFilename(name: string): boolean {
  return ISO_DATE_FILENAME.test(name)
}

export function displayFilename(filepath: string): string | null {
  const basename = noteBasename(filepath)
  if (isIsoDateFilename(basename)) return null
  return basename.endsWith('.md') ? basename.slice(0, -3) : basename
}

export function listDisplayName(filepath: string): string {
  const named = displayFilename(filepath)
  if (named) return named
  const basename = noteBasename(filepath)
  return basename.endsWith('.md') ? basename.slice(0, -3) : basename
}

const DRAWING_FIGURE_RE = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi
const SVG_BLOCK_RE = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi

function isDrawingFigure(html: string): boolean {
  return /<svg\b/i.test(html) || /data-type=["'](?:drawing|js-draw)["']/i.test(html)
}

function stripHtmlForPreview(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(DRAWING_FIGURE_RE, (match) => (isDrawingFigure(match) ? '[drawing]' : ''))
    .replace(SVG_BLOCK_RE, '[drawing]')
    .replace(/<[^>]+\/>/g, '')
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<[^>]+>/g, '')
}

function stripHeadingForPreview(line: string): string | null {
  const match = line.match(/^\s*#{1,6}\s+(.+?)(?:\s+#+\s*)?\s*$/)
  return match ? match[1].trim() : null
}

function stripBlockMarkdownForPreview(line: string): string {
  return line
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

export type PreviewSegment = { text: string; bold: boolean }

export function previewLineSegments(line: string): PreviewSegment[] {
  const segments: PreviewSegment[] = []
  const boldPattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = boldPattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), bold: false })
    }
    segments.push({ text: match[1], bold: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false })
  }

  if (segments.length === 0) {
    segments.push({ text: line, bold: false })
  }

  return segments
}

export function stripMarkdownForPreview(text: string): string {
  const lines = stripHtmlForPreview(text)
    .split('\n')
    .map((line) => {
      const headingText = stripHeadingForPreview(line)
      if (headingText !== null) {
        const plain = stripInlineMarkdownForPreview(headingText)
        return plain ? `**${plain}**` : ''
      }
      return stripInlineMarkdownForPreview(stripBlockMarkdownForPreview(line))
    })
    .filter((line) => line.length > 0)

  return lines.join('\n').trim()
}

export function previewFromContent(text: string): string {
  const plain = stripMarkdownForPreview(text.replace(/\r\n/g, '\n'))
  const fiveLines = plain.split('\n').slice(0, 5).join('\n')
  const oneFifty = plain.slice(0, 150)
  const excerpt = (fiveLines.length <= oneFifty.length ? fiveLines : oneFifty).trim()

  return excerpt || 'Empty note'
}
