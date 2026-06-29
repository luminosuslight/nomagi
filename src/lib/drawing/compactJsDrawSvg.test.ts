import { describe, expect, it } from 'vitest'

import { formatSvgNumber, roundNumbersInSvgValue } from '@/lib/drawing/compactJsDrawSvg'

describe('formatSvgNumber', () => {
  it('rounds to integers when decimals is 0', () => {
    expect(formatSvgNumber(12.6, 0)).toBe('13')
    expect(formatSvgNumber(-3.4, 0)).toBe('-3')
  })

  it('rounds to one decimal place and trims trailing zeros', () => {
    expect(formatSvgNumber(12.04, 1)).toBe('12')
    expect(formatSvgNumber(12.06, 1)).toBe('12.1')
    expect(formatSvgNumber(-0.04, 1)).toBe('0')
  })
})

describe('roundNumbersInSvgValue', () => {
  it('rounds path coordinates', () => {
    expect(roundNumbersInSvgValue('M 10.123456 20.789012 L 30.444 40.555', 1)).toBe(
      'M 10.1 20.8 L 30.4 40.6',
    )
  })

  it('rounds viewBox values', () => {
    expect(roundNumbersInSvgValue('0 0 500.04 250.96', 1)).toBe('0 0 500 251')
  })

  it('rounds stroke-width and matrix transforms', () => {
    expect(roundNumbersInSvgValue('matrix(1.00000001 0 0 1.00000001 0.123456 0.987654)', 1)).toBe(
      'matrix(1 0 0 1 0.1 1)',
    )
    expect(roundNumbersInSvgValue('2.3333333', 1)).toBe('2.3')
  })
})
