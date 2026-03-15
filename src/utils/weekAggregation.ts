import type { Entry } from './types'

/**
 * Get ISO week number for a date.
 * Returns string in format "YYYY-Www" (e.g., "2026-W01").
 * ISO weeks start on Monday, week 1 is the week containing the first Thursday.
 */
function getISOWeek(date: Date): string {
  // Simple implementation: using Date#getDay and adjusting to Monday start
  // For simplicity, using a reliable algorithm
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7 // Make Monday=0, Sunday=6
  target.setDate(target.getDate() - dayNr + 3) // Thursday of the week
  const firstThursday = target.valueOf()
  target.setMonth(0, 1) // January 1
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7) // First Thursday
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 60 * 60 * 1000))
  const year = target.getFullYear()
  return `${year}-W${weekNum.toString().padStart(2, '0')}`
}

/**
 * Group entries by ISO week, using the latest value within each week.
 * Returns array of data points sorted chronologically.
 */
export function groupEntriesByWeek(entries: Entry[]): Array<{ week: string; value: number; date: string }> {
  if (entries.length === 0) return []

  // Sort entries by date ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const weekMap = new Map<string, { value: number; date: string }>()

  for (const entry of sorted) {
    const week = getISOWeek(new Date(entry.date))
    // Keep the latest entry in the week (since we iterate chronologically, later overwrites)
    weekMap.set(week, { value: entry.value, date: entry.date })
  }

  // Convert to array and sort by week
  return Array.from(weekMap.entries())
    .map(([week, { value, date }]) => ({ week, value, date }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

/**
 * Format week label for display (e.g., "W1", "W2").
 */
export function formatWeekLabel(weekStr: string): string {
  const match = weekStr.match(/W(\d+)$/)
  return match ? `Week ${parseInt(match[1], 10)}` : weekStr
}