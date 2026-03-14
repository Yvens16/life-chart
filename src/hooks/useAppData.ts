// src/hooks/useAppData.ts
import { useState, useEffect } from 'react'
import type { AppData } from '../types'
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

  // Mutate data: update local state and persist to server
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

  // Helper to update goals (common operation)
  async function updateGoals(goals: AppData['goals']) {
    if (!data) return
    await mutate({ ...data, goals })
  }

  // Helper to update categories
  async function updateCategories(categories: AppData['categories']) {
    if (!data) return
    await mutate({ ...data, categories })
  }

  // Helper to add a new goal
  async function addGoal(goal: AppData['goals'][number]) {
    if (!data) return
    await mutate({ ...data, goals: [...data.goals, goal] })
  }

  // Helper to update a goal by ID
  async function updateGoal(id: string, updates: Partial<AppData['goals'][number]>) {
    if (!data) return
    const goals = data.goals.map(goal =>
      goal.id === id ? { ...goal, ...updates } : goal
    )
    await mutate({ ...data, goals })
  }

  // Helper to delete a goal by ID
  async function deleteGoal(id: string) {
    if (!data) return
    const goals = data.goals.filter(goal => goal.id !== id)
    await mutate({ ...data, goals })
  }

  // Helper to add an entry to a goal
  async function addEntry(goalId: string, entry: AppData['goals'][number]['entries'][number]) {
    if (!data) return
    const goals = data.goals.map(goal =>
      goal.id === goalId
        ? { ...goal, entries: [...goal.entries, entry] }
        : goal
    )
    await mutate({ ...data, goals })
  }

  // Helper to update an entry
  async function updateEntry(goalId: string, entryId: string, updates: Partial<AppData['goals'][number]['entries'][number]>) {
    if (!data) return
    const goals = data.goals.map(goal => {
      if (goal.id !== goalId) return goal
      const entries = goal.entries.map(entry =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      )
      return { ...goal, entries }
    })
    await mutate({ ...data, goals })
  }

  // Helper to delete an entry
  async function deleteEntry(goalId: string, entryId: string) {
    if (!data) return
    const goals = data.goals.map(goal => {
      if (goal.id !== goalId) return goal
      const entries = goal.entries.filter(entry => entry.id !== entryId)
      return { ...goal, entries }
    })
    await mutate({ ...data, goals })
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
    refetch: () => {
      setLoading(true)
      fetchData()
        .then(setData)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  }
}