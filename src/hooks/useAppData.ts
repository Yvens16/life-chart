import { useState, useEffect, useMemo } from 'react'
import type { AppData, Goal, Entry } from '../types'
import { fetchData, saveData } from '../api'
import { getErrorMessage } from '../utils/errors'

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeYear, setActiveYear] = useState(() => new Date().getFullYear())
  const [showNewYearPrompt, setShowNewYearPrompt] = useState(false)

  const currentYear = new Date().getFullYear()

  // Load initial data
  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const result = await fetchData()
        if (!mounted) return

        // Check if we should show the new-year carry-over prompt.
        // Fires when: we haven't shown it for this year AND there are goals from last year.
        const hasLastYearGoals = result.goals.some(g => g.year === currentYear - 1)
        const promptNeeded = result.promptShownForYear !== currentYear && hasLastYearGoals

        if (promptNeeded) {
          // Save the flag immediately so refreshing won't re-trigger the prompt
          const updated: AppData = { ...result, promptShownForYear: currentYear }
          saveData(updated).catch(err =>
            console.warn('[life-chart] Failed to persist promptShownForYear:', err)
          )
          setData(updated)
          setShowNewYearPrompt(true)
        } else {
          setData(result)
        }

        setError(null)
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mutate data: persist to server then update local state
  async function mutate(newData: AppData) {
    try {
      await saveData(newData)
      setData(newData)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
      throw err
    }
  }

  // Helpers guard against calling before data is loaded
  function requireData(): AppData {
    if (!data) throw new Error('Data not loaded yet')
    return data
  }

  async function updateGoals(goals: AppData['goals']) {
    const current = requireData()
    await mutate({ ...current, goals })
  }

  async function updateCategories(categories: AppData['categories']) {
    const current = requireData()
    await mutate({ ...current, categories })
  }

  async function addGoal(goal: Goal) {
    const current = requireData()
    await mutate({ ...current, goals: [...current.goals, goal] })
  }

  // Only allow updating safe fields — not entries (use addEntry/updateEntry/deleteEntry)
  async function updateGoal(id: string, updates: Pick<Goal, 'name' | 'category' | 'unit' | 'targetValue'>) {
    const current = requireData()
    const goals = current.goals.map(goal =>
      goal.id === id ? { ...goal, ...updates } : goal
    )
    await mutate({ ...current, goals })
  }

  async function deleteGoal(id: string) {
    const current = requireData()
    const goals = current.goals.filter(goal => goal.id !== id)
    await mutate({ ...current, goals })
  }

  async function addEntry(goalId: string, entry: Entry) {
    const current = requireData()
    const goals = current.goals.map(goal =>
      goal.id === goalId
        ? { ...goal, entries: [...goal.entries, entry] }
        : goal
    )
    await mutate({ ...current, goals })
  }

  async function updateEntry(goalId: string, entryId: string, updates: Pick<Entry, 'date' | 'value'>) {
    const current = requireData()
    const goals = current.goals.map(goal => {
      if (goal.id !== goalId) return goal
      const entries = goal.entries.map(entry =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      )
      return { ...goal, entries }
    })
    await mutate({ ...current, goals })
  }

  async function deleteEntry(goalId: string, entryId: string) {
    const current = requireData()
    const goals = current.goals.map(goal => {
      if (goal.id !== goalId) return goal
      return { ...goal, entries: goal.entries.filter(e => e.id !== entryId) }
    })
    await mutate({ ...current, goals })
  }

  async function refetch() {
    setLoading(true)
    try {
      const result = await fetchData()
      setData(result)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  /** Copy a single goal forward into the current year. */
  async function carryForwardGoal(source: Goal, targetValue: number) {
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      name: source.name,
      category: source.category,
      unit: source.unit,
      startValue: source.startValue,
      targetValue,
      createdAt: new Date().toISOString(),
      year: currentYear,
      linkedGoalId: source.id,
      entries: [],
    }
    await addGoal(newGoal)
    setActiveYear(currentYear)
  }

  /** Copy multiple goals forward into the current year in a single save. */
  async function carryForwardGoals(sources: Goal[], targetValues: number[]) {
    const current = requireData()
    const newGoals: Goal[] = sources.map((source, i) => ({
      id: crypto.randomUUID(),
      name: source.name,
      category: source.category,
      unit: source.unit,
      startValue: source.startValue,
      targetValue: targetValues[i] ?? source.targetValue,
      createdAt: new Date().toISOString(),
      year: currentYear,
      linkedGoalId: source.id,
      entries: [],
    }))
    await mutate({ ...current, goals: [...current.goals, ...newGoals] })
    setActiveYear(currentYear)
  }

  function dismissNewYearPrompt() {
    setShowNewYearPrompt(false)
  }

  // All years that have goals, plus the current year — sorted descending
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear])
    if (data) {
      for (const g of data.goals) years.add(g.year)
    }
    return [...years].sort((a, b) => b - a)
  }, [data, currentYear])

  // Memoize the returned object so the context value reference is stable
  // when data/loading/error haven't changed — prevents all consumers from
  // re-rendering on every unrelated render of AppDataProvider.
  return useMemo(
    () => ({
      data,
      loading,
      error,
      activeYear,
      setActiveYear,
      availableYears,
      currentYear,
      showNewYearPrompt,
      dismissNewYearPrompt,
      mutate,
      updateGoals,
      updateCategories,
      addGoal,
      updateGoal,
      deleteGoal,
      addEntry,
      updateEntry,
      deleteEntry,
      carryForwardGoal,
      carryForwardGoals,
      refetch,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, loading, error, activeYear, availableYears, showNewYearPrompt],
  )
}
