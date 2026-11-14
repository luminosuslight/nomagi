import { describe, expect, it } from 'vitest'
import { formatNoteDate, recencyGroup } from '@/lib/formatNoteDate'

const now = new Date(2026, 10, 14, 13, 0).getTime()
const HOUR = 3_600_000

describe('formatNoteDate', () => {
  it('is empty for unknown dates', () => {
    expect(formatNoteDate(0, now)).toBe('')
  })

  it('uses minutes within the last hour', () => {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
    expect(formatNoteDate(now - 5 * 60_000, now)).toBe(rtf.format(-5, 'minute'))
  })

  it('uses the time earlier today', () => {
    const timestamp = now - 3 * HOUR
    expect(formatNoteDate(timestamp, now)).toBe(
      new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    )
  })

  it('includes the year for older dates', () => {
    expect(formatNoteDate(new Date(2022, 3, 9).getTime(), now)).toMatch(/2022/)
  })
})

describe('recencyGroup', () => {
  it('buckets by calendar day', () => {
    expect(recencyGroup(now - HOUR, now)).toBe('Today')
    expect(recencyGroup(now - 24 * HOUR, now)).toBe('Yesterday')
    expect(recencyGroup(now - 4 * 24 * HOUR, now)).toBe('This week')
    expect(recencyGroup(now - 30 * 24 * HOUR, now)).toBe('Earlier')
    expect(recencyGroup(0, now)).toBe('Earlier')
  })
})
