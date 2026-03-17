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
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const goals = data?.goals ?? []
  const categories = data?.categories ?? []

  const filteredGoals = useMemo(() => {
    if (!activeCategory) return goals
    return goals.filter(g => g.category === activeCategory)
  }, [goals, activeCategory])

  if (loading) {
    return (
      <div className="dashboard-loading" role="status" aria-busy="true">
        <div className="spinner" aria-hidden="true" />
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

  const handleFilterClick = (category: string | null) => {
    setActiveCategory(prev => (prev === category ? null : category))
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

      {categories.length > 0 && (
        <div className="dashboard-filter-bar" role="toolbar" aria-label="Filter by category">
          <button
            className={`filter-pill${activeCategory === null ? ' filter-pill--active' : ''}`}
            aria-pressed={activeCategory === null}
            onClick={() => handleFilterClick(null)}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              className={`filter-pill${activeCategory === category ? ' filter-pill--active' : ''}`}
              aria-pressed={activeCategory === category}
              onClick={() => handleFilterClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="goal-card-grid">
        {filteredGoals.map(goal => (
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

      {createModalOpen && (
        <CreateGoalModal open onClose={() => setCreateModalOpen(false)} />
      )}
      {editModalOpen && editingGoal && (
        <CreateGoalModal open onClose={handleCloseEditModal} goal={editingGoal} />
      )}
    </div>
  )
}
