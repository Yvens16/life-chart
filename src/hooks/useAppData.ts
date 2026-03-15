import { useState, useEffect } from 'react'
import type { AppData, Goal, Entry } from '../types'
import { fetchData, saveData } from '../api'

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const result = await fetchData()
        if (mounted) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
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
  }, [])

  // Mutate data: persist to server then update local state
  async function mutate(newData: AppData) {
    try {
      await saveData(newData)
      setData(newData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data')
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
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    mutate,
    updateGoals,
    updateCategories,
    addGoal,
    updateGoal,
    deleteGoal,
    addEntry,
    updateEntry,
    deleteEntry,
    refetch,
  }
}
