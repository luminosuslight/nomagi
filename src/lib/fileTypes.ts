export function isMarkdownFile(filepath: string): boolean {
  return filepath.endsWith('.md')
}

export function isPdfFile(filepath: string): boolean {
  return filepath.toLowerCase().endsWith('.pdf')
}

export function isNoteFile(filepath: string): boolean {
  return isMarkdownFile(filepath) || isPdfFile(filepath)
}
