import type { Goal } from '../types'

/**
 * Calculate percentage progress toward a goal's target.
 * Works for both increasing goals (e.g. savings: 0 → 5000)
 * and decreasing goals (e.g. weight: 180 → 160).
 * Returns a value clamped between 0 and 100.
 */
export function calculateProgress(goal: Goal): number {
  if (goal.entries.length === 0) return 0
  const latest = goal.entries[goal.entries.length - 1]?.value ?? goal.startValue
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
  const latest = goal.entries[goal.entries.length - 1]?.value ?? goal.startValue
  return goal.targetValue > goal.startValue
    ? latest >= goal.startValue
    : latest <= goal.startValue
}
