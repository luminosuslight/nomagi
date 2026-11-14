const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export type RecencyGroup = 'Today' | 'Yesterday' | 'This week' | 'Earlier'

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Compact last-changed label: "5 min. ago", "14:05", "Mon", "31 Oct", "Oct 2022". Empty when unknown. */
export function formatNoteDate(timestamp: number, now = Date.now()): string {
  if (timestamp <= 0) return ''

  const diff = now - timestamp
  if (diff < HOUR) {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
    return rtf.format(-Math.max(0, Math.floor(diff / MINUTE)), 'minute')
  }

  const date = new Date(timestamp)
  if (startOfDay(timestamp) === startOfDay(now)) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 6 * DAY) return date.toLocaleDateString(undefined, { weekday: 'short' })
  if (date.getFullYear() === new Date(now).getFullYear()) {
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export function recencyGroup(timestamp: number, now = Date.now()): RecencyGroup {
  const today = startOfDay(now)
  if (timestamp >= today) return 'Today'
  if (timestamp >= today - DAY) return 'Yesterday'
  if (timestamp >= today - 6 * DAY) return 'This week'
  return 'Earlier'
}
