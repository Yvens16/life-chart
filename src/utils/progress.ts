import type { Goal } from '../types'

/**
 * Return the value of the entry with the latest date.
 * Uses reduce (O(n)) to avoid allocating a sorted copy.
 * ISO-8601 YYYY-MM-DD strings compare correctly lexicographically.
 */
function latestEntryValue(goal: Goal): number {
  if (goal.entries.length === 0) return goal.startValue
  return goal.entries.reduce(
    (max, e) => (e.date > max.date ? e : max),
    goal.entries[0]!,
  ).value
}

/**
 * Calculate percentage progress toward a goal's target.
 * Works for both increasing goals (e.g. savings: 0 → 5000)
 * and decreasing goals (e.g. weight: 180 → 160).
 * Returns a value clamped between 0 and 100.
 */
export function calculateProgress(goal: Goal): number {
  if (goal.entries.length === 0) return 0
  const latest = latestEntryValue(goal)
  const range = Math.abs(goal.targetValue - goal.startValue)
  if (range === 0) return 100
  const distance = Math.abs(latest - goal.startValue)
  const isCorrectDirection =
    goal.targetValue > goal.startValue
      ? latest >= goal.startValue
      : latest <= goal.startValue
  const progress = isCorrectDirection ? (distance / range) * 100 : 0
  return Math.min(progress, 100)
}

/**
 * Returns true if the latest entry is moving toward the target.
 * Defaults to true when there are no entries yet.
 */
export function isGoalProgressing(goal: Goal): boolean {
  if (goal.entries.length === 0) return true
  const latest = latestEntryValue(goal)
  return goal.targetValue > goal.startValue
    ? latest >= goal.startValue
    : latest <= goal.startValue
}
