import { describe, expect, it } from 'vitest'
import { formatStorageBytes } from './browserStorage'

describe('formatStorageBytes', () => {
  it('formats sub-megabyte usage', () => {
    expect(formatStorageBytes(546_156)).toBe('533 KB')
  })

  it('formats large quotas in gigabytes', () => {
    expect(formatStorageBytes(147_064_317_542)).toBe('137 GB')
  })

  it('formats kilobytes', () => {
    expect(formatStorageBytes(2048)).toBe('2 KB')
  })
})
