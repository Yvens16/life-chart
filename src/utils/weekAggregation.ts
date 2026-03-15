import type { Entry } from '../types'

/**
 * Get simple week number for a date.
 * Returns string in format "YYYY-Www" (e.g., "2026-W01").
 * Week 1 starts on January 1, each week is 7 days.
 */
function getSimpleWeek(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const days = Math.floor((date.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000))
  const week = Math.floor(days / 7) + 1
  return `${year}-W${week.toString().padStart(2, '0')}`
}

/**
 * Group entries by week, using the latest value within each week.
 * Returns array of data points sorted chronologically.
 */
export function groupEntriesByWeek(entries: Entry[]): Array<{ week: string; value: number; date: string }> {
  if (entries.length === 0) return []

  // Sort entries by date ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const weekMap = new Map<string, { value: number; date: string }>()

  for (const entry of sorted) {
    const week = getSimpleWeek(entry.date)
    // Keep the latest entry in the week (since we iterate chronologically, later overwrites)
    weekMap.set(week, { value: entry.value, date: entry.date })
  }

  // Convert to array and sort by week
  return Array.from(weekMap.entries())
    .map(([week, { value, date }]) => ({ week, value, date }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

/**
 * Format week label for display (e.g., "Week 1", "Week 2").
 */
export function formatWeekLabel(weekStr: string): string {
  const match = weekStr.match(/W(\d+)$/)
  return match ? `Week ${parseInt(match[1], 10)}` : weekStr
}