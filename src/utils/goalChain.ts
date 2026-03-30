import type { Goal } from '../types'

const MAX_CHAIN_DEPTH = 50

/**
 * Walks the linkedGoalId chain backward from `goal` and returns all goals in
 * the chain, sorted oldest-first (i.e. the chain root first, `goal` last).
 *
 * Handles dangling references gracefully — stops walking when a referenced
 * goal is not found. The `MAX_CHAIN_DEPTH` guard prevents infinite loops from
 * any accidental circular references.
 */
export function buildGoalChain(goal: Goal, allGoals: Goal[]): Goal[] {
  const byId = new Map(allGoals.map(g => [g.id, g]))
  const chain: Goal[] = [goal]
  const visited = new Set<string>([goal.id])

  let current = goal
  while (current.linkedGoalId && chain.length < MAX_CHAIN_DEPTH) {
    if (visited.has(current.linkedGoalId)) break // circular reference guard
    const ancestor = byId.get(current.linkedGoalId)
    if (!ancestor) break // dangling reference — stop walking
    visited.add(ancestor.id)
    chain.unshift(ancestor)
    current = ancestor
  }

  return chain
}

/**
 * Returns the value of the entry with the latest date for a goal,
 * or null if the goal has no entries.
 */
export function getFinalEntryValue(goal: Goal): number | null {
  if (goal.entries.length === 0) return null
  return goal.entries.reduce((best, e) =>
    e.date.localeCompare(best.date) > 0 ? e : best
  ).value
}

/**
 * Computes progress percentage: how far from startValue toward targetValue
 * the finalValue is. Returns null when the range is zero (target === start).
 */
export function computeProgressPercent(goal: Goal, finalValue: number): number | null {
  const range = goal.targetValue - goal.startValue
  if (range === 0) return null
  return ((finalValue - goal.startValue) / range) * 100
}
