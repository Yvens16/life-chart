// src/components/Dashboard.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { calculateProgress } from '../utils/progress'
import type { Goal } from '../types'
import GoalCard from './GoalCard'
import EmptyState from './EmptyState'
import './Dashboard.css'
import CreateGoalModal from './CreateGoalModal'

export default function Dashboard() {
  const { data, loading, error, deleteGoal } = useAppData()
  const { showError } = useToast()
  const navigate = useNavigate()
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Group goals by category — memoized on data so re-renders from modal
  // open/close don't recompute the O(categories × goals) grouping.
  const goalsByCategory = useMemo(() => {
    const gs = data?.goals ?? []
    const cats = data?.categories ?? []
    const result: Record<string, typeof gs> = {}
    gs.forEach(goal => {
      if (!result[goal.category]) result[goal.category] = []
      result[goal.category]!.push(goal)
    })
    // Ensure all categories appear even if empty
    cats.forEach(cat => {
      if (!result[cat]) result[cat] = []
    })
    return result
  }, [data])

  const goals = data?.goals ?? []
  const categories = data?.categories ?? []

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <span>Loading your goals...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error loading data: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      try {
        await deleteGoal(goalId)
      } catch (err) {
        showError(`Failed to delete goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }

  const handleCreateGoalClick = () => {
    setEditingGoal(null)
    setCreateModalOpen(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    setEditingGoal(null)
  }

  // Empty state: no goals at all
  if (goals.length === 0) {
    return (
      <EmptyState
        message="You haven't created any goals yet."
        ctaLabel="Create your first goal"
        onCtaClick={handleCreateGoalClick}
      />
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Goal Progress Dashboard</h1>
        <p>Track your progress across {goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
        <button className="dashboard-create-goal-btn" onClick={handleCreateGoalClick}>
          + Create Goal
        </button>
      </header>

      <div className="dashboard-categories">
        {categories.map(category => {
          const categoryGoals = goalsByCategory[category] || []
          const isCollapsed = collapsedCategories.has(category)

          return (
            <section key={category} className="dashboard-category">
              <header className="category-header" onClick={() => toggleCategory(category)}>
                <h2 className="category-title">{category}</h2>
                <span className="category-count">{categoryGoals.length} goal{categoryGoals.length !== 1 ? 's' : ''}</span>
                <span className="category-toggle">{isCollapsed ? '▶' : '▼'}</span>
              </header>

              {!isCollapsed && (
                <div className="category-goals">
                  {categoryGoals.length > 0 ? (
                    <div className="goal-card-grid">
                      {categoryGoals.map(goal => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          progress={calculateProgress(goal)}
                          onClick={() => navigate(`/goal/${goal.id}`)}
                          onEdit={() => handleEditGoal(goal)}
                          onDelete={() => handleDeleteGoal(goal.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="category-empty">
                      <p>No goals in this category yet.</p>
                      <button onClick={handleCreateGoalClick}>
                        Add a goal to {category}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
      {createModalOpen && (
        <CreateGoalModal open onClose={() => setCreateModalOpen(false)} />
      )}
      {editModalOpen && editingGoal && (
        <CreateGoalModal open onClose={handleCloseEditModal} goal={editingGoal} />
      )}
    </div>
  )
}