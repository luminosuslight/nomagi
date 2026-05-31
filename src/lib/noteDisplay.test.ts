import { describe, expect, it } from 'vitest'
import { listDisplayName, previewFromContent, stripMarkdownForPreview } from '@/lib/noteDisplay'

describe('listDisplayName', () => {
  it('strips .md from named notes', () => {
    expect(listDisplayName('my-note.md')).toBe('my-note')
  })

  it('shows ISO auto-names without .md', () => {
    expect(listDisplayName('2026-05-31T12-30-45.md')).toBe('2026-05-31T12-30-45')
  })
})

describe('stripMarkdownForPreview', () => {
  it('strips headings, bullets, bold, and html', () => {
    const input = [
      '# Title',
      '- item',
      '**bold** text',
      '<figure data-type="drawing">x</figure>',
    ].join('\n')

    expect(stripMarkdownForPreview(input)).toBe('Title\n• item\nbold text')
  })

  it('replaces task checkboxes with unicode symbols', () => {
    const input = ['- [ ] todo', '* [ ] asterisk', '- [x] done', '* [X] also'].join('\n')
    expect(stripMarkdownForPreview(input)).toBe('☐ todo\n☐ asterisk\n☑ done\n☑ also')
  })

  it('replaces unordered list markers with bullet dots', () => {
    const input = ['- dash', '* one', '* two', '+ three'].join('\n')
    expect(stripMarkdownForPreview(input)).toBe('• dash\n• one\n• two\n• three')
  })

  it('handles consecutive asterisk list lines without breaking checkboxes', () => {
    const input = ['* first', '* [ ] second'].join('\n')
    expect(stripMarkdownForPreview(input)).toBe('• first\n☐ second')
  })
})

describe('previewFromContent', () => {
  it('uses first 5 lines when shorter than 150 chars', () => {
    const text = 'line one\nline two\nline three'
    expect(previewFromContent(text)).toBe('line one\nline two\nline three')
  })

  it('uses first 150 chars when shorter than 5 lines', () => {
    const longLine = 'a'.repeat(200)
    const text = `${longLine}\nignored`
    expect(previewFromContent(text)).toBe('a'.repeat(150))
  })

  it('returns Empty note for whitespace-only content', () => {
    expect(previewFromContent('   \n\n  ')).toBe('Empty note')
  })

  it('strips markdown in excerpt', () => {
    expect(previewFromContent('# Hello\n**world**')).toBe('Hello\nworld')
  })

  it('removes empty lines from preview', () => {
    expect(previewFromContent('# Title\n\n\nBody')).toBe('Title\nBody')
  })
})
