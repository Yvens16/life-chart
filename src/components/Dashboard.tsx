// src/components/Dashboard.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAppData } from '../context/AppDataContext'
import { calculateProgress } from '../utils/progress'
import type { Goal } from '../types'
import GoalCard from './GoalCard'
import EmptyState from './EmptyState'
import './Dashboard.css'
import CreateGoalModal from './CreateGoalModal'

export default function Dashboard() {
  const { data, loading, error, deleteGoal } = useAppData()
  const navigate = useNavigate()
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  if (loading) {
    return <div className="dashboard-loading">Loading your goals...</div>
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error loading data: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  const goals = data?.goals ?? []
  const categories = data?.categories ?? []

  // Group goals by category
  const goalsByCategory: Record<string, typeof goals> = {}
  goals.forEach(goal => {
    if (!goalsByCategory[goal.category]) {
      goalsByCategory[goal.category] = []
    }
    goalsByCategory[goal.category].push(goal)
  })

  // Ensure all categories appear even if empty (for master list)
  categories.forEach(cat => {
    if (!goalsByCategory[cat]) {
      goalsByCategory[cat] = []
    }
  })

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
        alert(`Failed to delete goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
                      <button onClick={() => console.log('TODO: create goal in this category')}>
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
      <CreateGoalModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <CreateGoalModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        goal={editingGoal || undefined}
      />
    </div>
  )
}