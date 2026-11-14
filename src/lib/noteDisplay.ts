const ISO_DATE_FILENAME = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d+)?\.(md|canvas)$/

/** Markdown list marker: dash, asterisk, or plus. */
const LIST_MARKER = '(?:[-*+])'

export function noteBasename(filepath: string): string {
  const slash = filepath.lastIndexOf('/')
  return slash === -1 ? filepath : filepath.slice(slash + 1)
}

export function isIsoDateFilename(name: string): boolean {
  return ISO_DATE_FILENAME.test(name)
}

function stripNoteExtension(basename: string): string {
  if (basename.endsWith('.md')) return basename.slice(0, -3)
  const lower = basename.toLowerCase()
  if (lower.endsWith('.pdf')) return basename.slice(0, -4)
  if (lower.endsWith('.canvas')) return basename.slice(0, -7)
  return basename
}

export function displayFilename(filepath: string): string | null {
  const basename = noteBasename(filepath)
  if (isIsoDateFilename(basename)) return null
  return stripNoteExtension(basename)
}

export function listDisplayName(filepath: string): string {
  return displayFilename(filepath) ?? stripNoteExtension(noteBasename(filepath))
}

export function noteFolder(filepath: string): string {
  const slash = filepath.lastIndexOf('/')
  return slash === -1 ? '' : filepath.slice(0, slash)
}

/** Image alt text is often a Crepe resize ratio (e.g. `0.50`), so it is not shown in previews. */
const IMAGE_PREVIEW = '<img>'
const DRAWING_PREVIEW = '[drawing]'
const PREVIEW_MAX_LINES = 12
const PREVIEW_MAX_CHARS = 500

const DRAWING_FIGURE_RE = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi
const SVG_BLOCK_RE = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi

function isDrawingFigure(html: string): boolean {
  return /<svg\b/i.test(html) || /data-type=["'](?:drawing|js-draw)["']/i.test(html)
}

function stripHtmlForPreview(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(DRAWING_FIGURE_RE, (match) => (isDrawingFigure(match) ? DRAWING_PREVIEW : ''))
    .replace(SVG_BLOCK_RE, DRAWING_PREVIEW)
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
    .replace(new RegExp(`^\\s*${LIST_MARKER}\\s+\\[\\s*\\](?:\\s+|$)`), '☐ ')
    .replace(new RegExp(`^\\s*${LIST_MARKER}\\s+\\[[xX]\\](?:\\s+|$)`), '☑ ')
    .replace(new RegExp(`^\\s*${LIST_MARKER}(?:\\s+|$)`), '• ')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/\s+$/, '')
}

function stripInlineMarkdownForPreview(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, IMAGE_PREVIEW)
    .replace(/\[([^\]]*)\]\(<[^>]*>\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\([!-/:-@[-`{-~])/g, '$1')
}

export type PreviewMarker = 'bullet' | 'todo' | 'done' | null
export type PreviewSegment = { text: string; bold?: boolean; media?: 'image' | 'drawing' }
export type PreviewLine = { marker: PreviewMarker; segments: PreviewSegment[] }

const PREVIEW_MARKERS: [prefix: string, marker: PreviewMarker][] = [
  ['• ', 'bullet'],
  ['☐ ', 'todo'],
  ['☑ ', 'done'],
]

/** Parses one line of {@link stripMarkdownForPreview} output into a marker and styled segments. */
export function parsePreviewLine(line: string): PreviewLine {
  const found = PREVIEW_MARKERS.find(([prefix]) => line.startsWith(prefix))
  const body = found ? line.slice(found[0].length) : line
  const segments: PreviewSegment[] = []

  for (const part of body.split(/(\*\*.+?\*\*|<img>|\[drawing\])/)) {
    if (!part) continue
    if (part === IMAGE_PREVIEW) segments.push({ text: 'Image', media: 'image' })
    else if (part === DRAWING_PREVIEW) segments.push({ text: 'Drawing', media: 'drawing' })
    else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      segments.push({ text: part.slice(2, -2), bold: true })
    } else segments.push({ text: part })
  }

  return { marker: found?.[1] ?? null, segments }
}

/** Splits `text` into alternating plain and case-insensitive `query` match parts. */
export function highlightParts(text: string, query = ''): { text: string; match: boolean }[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [{ text, match: false }]

  const lower = text.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let pos = 0
  for (let idx = lower.indexOf(needle); idx !== -1; idx = lower.indexOf(needle, pos)) {
    if (idx > pos) parts.push({ text: text.slice(pos, idx), match: false })
    parts.push({ text: text.slice(idx, idx + needle.length), match: true })
    pos = idx + needle.length
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), match: false })
  return parts
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
    .filter((line) => !/^[•☐☑]?$/.test(line))

  return lines.join('\n').trim()
}

export function previewFromContent(text: string): string {
  const plain = stripMarkdownForPreview(text.replace(/\r\n/g, '\n'))
  const byLines = plain.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n')
  const byChars = plain.slice(0, PREVIEW_MAX_CHARS)
  const excerpt = (byLines.length <= byChars.length ? byLines : byChars).trim()

  return excerpt || 'Empty note'
}

const MATCH_LINES = 4
const MATCH_LEAD_CHARS = 30

/** Preview of the lines containing `query`, each trimmed to start near the match; null if none match. */
export function matchPreview(text: string, query: string): string | null {
  const needle = query.trim().toLowerCase()
  if (!needle) return null

  const lines = stripMarkdownForPreview(text.replace(/\r\n/g, '\n'))
    .split('\n')
    .filter((line) => line.toLowerCase().includes(needle))
    .slice(0, MATCH_LINES)
    .map((line) => {
      const idx = line.toLowerCase().indexOf(needle)
      if (idx <= MATCH_LEAD_CHARS + 10) return line
      return `…${line
        .slice(idx - MATCH_LEAD_CHARS)
        .replace(/\*\*/g, '')
        .trimStart()}`
    })

  return lines.length ? lines.join('\n') : null
}
