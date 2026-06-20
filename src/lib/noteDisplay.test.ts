import { describe, expect, it } from 'vitest'
import { listDisplayName, previewFromContent, stripMarkdownForPreview } from '@/lib/noteDisplay'

describe('listDisplayName', () => {
  it('strips .md from named notes', () => {
    expect(listDisplayName('my-note.md')).toBe('my-note')
  })

  it('shows ISO auto-names without .md', () => {
    expect(listDisplayName('2026-05-31T12-30-45.md')).toBe('2026-05-31T12-30-45')
  })

  it('uses basename for nested ISO paths', () => {
    expect(listDisplayName('quick_notes/2026-05-31T12-30-45.md')).toBe('2026-05-31T12-30-45')
  })

  it('uses basename for nested named paths', () => {
    expect(listDisplayName('docs/my-note.md')).toBe('my-note')
  })

  it('strips .pdf extension', () => {
    expect(listDisplayName('docs/paper.pdf')).toBe('paper')
  })
})

describe('stripMarkdownForPreview', () => {
  it('strips headings, bullets, bold, and html', () => {
    const input = ['# Title', '- item', '**bold** text', '<p>removed</p>'].join('\n')

    expect(stripMarkdownForPreview(input)).toBe('**Title**\n• item\nbold text')
  })

  it('replaces drawing figures and svg blocks with [drawing]', () => {
    const drawingFigure = [
      '<figure data-type="drawing" class="sketch">',
      '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M10 10 L20 20"></path>',
      '</svg>',
      '</figure>',
    ].join('\n')
    const jsDrawFigure = [
      '<figure data-type="js-draw" class="js-draw-sketch">',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250"></svg>',
      '</figure>',
    ].join('\n')
    const standaloneSvg = '<svg><circle cx="5" cy="5" r="3"/></svg>'

    expect(stripMarkdownForPreview(`before\n${drawingFigure}\nafter`)).toBe(
      'before\n[drawing]\nafter',
    )
    expect(stripMarkdownForPreview(jsDrawFigure)).toBe('[drawing]')
    expect(stripMarkdownForPreview(standaloneSvg)).toBe('[drawing]')
  })

  it('wraps heading text in bold markers', () => {
    expect(stripMarkdownForPreview('## Section')).toBe('**Section**')
    expect(stripMarkdownForPreview('  ### Nested  ###  ')).toBe('**Nested**')
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
    expect(previewFromContent('# Hello\n**world**')).toBe('**Hello**\nworld')
  })

  it('removes empty lines from preview', () => {
    expect(previewFromContent('# Title\n\n\nBody')).toBe('**Title**\nBody')
  })

  it('replaces drawing html before applying length limit', () => {
    const path = '<path d="M701,275l0,2" fill="none" stroke="#00008b" stroke-width="1"></path>'
    const text = [
      '<figure data-type="js-draw" class="js-draw-sketch">',
      `<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg">${path.repeat(30)}</svg>`,
      '</figure>',
      'visible text after drawing',
    ].join('\n')

    expect(previewFromContent(text)).toBe('[drawing]\nvisible text after drawing')
  })
})
