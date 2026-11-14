import { describe, expect, it } from 'vitest'
import {
  highlightParts,
  listDisplayName,
  matchPreview,
  noteFolder,
  parsePreviewLine,
  previewFromContent,
  stripMarkdownForPreview,
} from '@/lib/noteDisplay'

describe('noteFolder', () => {
  it('returns the parent path, or empty for root notes', () => {
    expect(noteFolder('Ideen/Bauen/note.md')).toBe('Ideen/Bauen')
    expect(noteFolder('note.md')).toBe('')
  })
})

describe('parsePreviewLine', () => {
  it('detects list markers and splits bold and media segments', () => {
    expect(parsePreviewLine('☐ buy **milk** <img>')).toEqual({
      marker: 'todo',
      segments: [
        { text: 'buy ' },
        { text: 'milk', bold: true },
        { text: ' ' },
        { text: 'Image', media: 'image' },
      ],
    })
    expect(parsePreviewLine('[drawing]').segments).toEqual([{ text: 'Drawing', media: 'drawing' }])
    expect(parsePreviewLine('plain').marker).toBeNull()
  })
})

describe('highlightParts', () => {
  it('marks case-insensitive matches', () => {
    expect(highlightParts('V-Neck and v-neck', 'v-neck')).toEqual([
      { text: 'V-Neck', match: true },
      { text: ' and ', match: false },
      { text: 'v-neck', match: true },
    ])
  })

  it('returns the text unchanged without a query', () => {
    expect(highlightParts('text', ' ')).toEqual([{ text: 'text', match: false }])
  })
})

describe('matchPreview', () => {
  it('keeps only matching lines', () => {
    expect(matchPreview('# Title\n- apple pie\n- pear\n- Apple juice', 'apple')).toBe(
      '• apple pie\n• Apple juice',
    )
  })

  it('trims long lines to start near the match', () => {
    const line = `${'x'.repeat(80)} needle end`
    expect(matchPreview(line, 'needle')).toBe(`…${'x'.repeat(29)} needle end`)
  })

  it('returns null when only markup matches', () => {
    expect(matchPreview('[link](https://example.com)', 'example')).toBeNull()
  })
})

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

  it('strips .canvas extension', () => {
    expect(listDisplayName('boards/plan.canvas')).toBe('plan')
    expect(listDisplayName('quick_notes/2026-05-31T12-30-45.canvas')).toBe('2026-05-31T12-30-45')
  })
})

describe('stripMarkdownForPreview', () => {
  it('strips headings, bullets, bold, and html', () => {
    const input = ['# Title', '- item', '**bold** text', '<p>removed</p>'].join('\n')

    expect(stripMarkdownForPreview(input)).toBe('**Title**\n• item\nbold text')
  })

  it('shows the result text of a formula link', () => {
    expect(stripMarkdownForPreview('| Total | [1600](<#SUM(B2:B3)>) |')).toBe('| Total | 1600 |')
  })

  it('shows images as a placeholder instead of their alt text', () => {
    const input = ['![0.50](img/a.png)', '- see ![Diagram](b.png "Caption")'].join('\n')

    expect(stripMarkdownForPreview(input)).toBe('<img>\n• see <img>')
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

  it('drops empty list items and unescapes markdown punctuation', () => {
    expect(stripMarkdownForPreview('- a\n-\n- [ ]\n- 16\\*80 Q\\&A')).toBe('• a\n• 16*80 Q&A')
  })

  it('handles consecutive asterisk list lines without breaking checkboxes', () => {
    const input = ['* first', '* [ ] second'].join('\n')
    expect(stripMarkdownForPreview(input)).toBe('• first\n☐ second')
  })
})

describe('previewFromContent', () => {
  it('uses first 12 lines when shorter than 500 chars', () => {
    const lines = Array.from({ length: 15 }, (_, i) => `line ${i}`)
    expect(previewFromContent(lines.join('\n'))).toBe(lines.slice(0, 12).join('\n'))
  })

  it('uses first 500 chars when shorter than 12 lines', () => {
    const longLine = 'a'.repeat(600)
    const text = `${longLine}\nignored`
    expect(previewFromContent(text)).toBe('a'.repeat(500))
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
