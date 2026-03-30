// src/components/Dashboard.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { calculateProgress } from '../utils/progress'
import type { Goal } from '../types'
import GoalCard from './GoalCard'
import EmptyState from './EmptyState'
import CreateGoalModal from './CreateGoalModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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

  const filterValue = activeCategory ?? '__all__'

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-20"
        role="status"
        aria-busy="true"
      >
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <span className="text-sm text-muted-foreground">Loading your goals...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Error loading data: {error}</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this goal? This action cannot be undone.'
      )
    ) {
      try {
        await deleteGoal(goalId)
      } catch (err) {
        showError(
          `Failed to delete goal: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
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

  const onFilterChange = (value: string) => {
    if (value === '' || value === '__all__') {
      setActiveCategory(null)
      return
    }
    setActiveCategory(value)
  }

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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Goal Progress Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your progress across {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="button" onClick={handleCreateGoalClick}>
          + Create Goal
        </Button>
      </div>

      {categories.length > 0 && (
        <ToggleGroup
          type="single"
          value={filterValue}
          onValueChange={onFilterChange}
          variant="outline"
          size="sm"
          spacing={0}
          className="flex-wrap"
          aria-label="Filter by category"
        >
          <ToggleGroupItem value="__all__" aria-label="All categories">
            All
          </ToggleGroupItem>
          {categories.map(category => (
            <ToggleGroupItem key={category} value={category}>
              {category}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <CreateGoalModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <CreateGoalModal
        open={editModalOpen && editingGoal !== null}
        onClose={handleCloseEditModal}
        goal={editingGoal ?? undefined}
      />
    </div>
  )
}
