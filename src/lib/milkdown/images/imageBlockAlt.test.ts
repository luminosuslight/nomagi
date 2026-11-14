import { describe, expect, it } from 'vitest'

import { imageBlockAltText, parseImageBlockAlt } from '@/lib/milkdown/images/imageBlockAlt'

describe('parseImageBlockAlt', () => {
  it('reads a Crepe resize ratio', () => {
    expect(parseImageBlockAlt('0.50')).toEqual({ alt: '', ratio: 0.5 })
    expect(parseImageBlockAlt('1.00')).toEqual({ alt: '', ratio: 1 })
  })

  it('keeps descriptive alt text', () => {
    expect(parseImageBlockAlt('Architecture diagram')).toEqual({
      alt: 'Architecture diagram',
      ratio: 1,
    })
    expect(parseImageBlockAlt('2024')).toEqual({ alt: '2024', ratio: 1 })
    expect(parseImageBlockAlt('')).toEqual({ alt: '', ratio: 1 })
    expect(parseImageBlockAlt(undefined)).toEqual({ alt: '', ratio: 1 })
  })

  it('ignores a zero ratio', () => {
    expect(parseImageBlockAlt('0.00')).toEqual({ alt: '0.00', ratio: 1 })
  })
})

describe('imageBlockAltText', () => {
  it('writes alt text when the image is not resized', () => {
    expect(imageBlockAltText('Diagram', 1)).toBe('Diagram')
    expect(imageBlockAltText('', 1)).toBe('')
  })

  it('writes the ratio when the image is resized', () => {
    expect(imageBlockAltText('Diagram', 0.5)).toBe('0.50')
  })
})
