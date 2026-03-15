import { useState, useEffect } from 'react'
import type { Goal } from '../types'
import { useAppData } from '../hooks/useAppData'
import './CreateGoalModal.css'

interface CreateGoalModalProps {
  open: boolean
  onClose: () => void
  goal?: Goal // if provided, edit mode
}

export default function CreateGoalModal({ open, onClose, goal }: CreateGoalModalProps) {
  const { data, addGoal, updateGoal, updateCategories } = useAppData()
  const categories = data?.categories ?? []
  const isEdit = !!goal

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [useNewCategory, setUseNewCategory] = useState(false)
  const [unit, setUnit] = useState('')
  const [startValue, setStartValue] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize form with goal data when in edit mode
  useEffect(() => {
    if (goal) {
      setName(goal.name)
      setCategory(goal.category)
      setNewCategory('')
      setUseNewCategory(false)
      setUnit(goal.unit)
      setStartValue(goal.startValue.toString())
      setTargetValue(goal.targetValue.toString())
    } else {
      // Reset form for create mode
      setName('')
      setCategory('')
      setNewCategory('')
      setUseNewCategory(false)
      setUnit('')
      setStartValue('')
      setTargetValue('')
    }
    setErrors({})
  }, [goal, open])

  if (!open) return null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Goal name is required'
    else if (name.length > 100) newErrors.name = 'Name must be 100 characters or less'

    const finalCategory = useNewCategory ? newCategory.trim() : category
    if (!finalCategory) newErrors.category = 'Category is required'
    else if (finalCategory.length > 50) newErrors.category = 'Category must be 50 characters or less'

    if (!unit.trim()) newErrors.unit = 'Unit is required'
    else if (unit.length > 20) newErrors.unit = 'Unit must be 20 characters or less'

    const start = parseFloat(startValue)
    if (isNaN(start)) newErrors.startValue = 'Start value must be a number'
    else if (!Number.isFinite(start)) newErrors.startValue = 'Start value must be finite'

    const target = parseFloat(targetValue)
    if (isNaN(target)) newErrors.targetValue = 'Target value must be a number'
    else if (!Number.isFinite(target)) newErrors.targetValue = 'Target value must be finite'
    else if (target === start) newErrors.targetValue = 'Target value must be different from start value'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const finalCategory = useNewCategory ? newCategory.trim() : category
      const start = parseFloat(startValue)
      const target = parseFloat(targetValue)

      if (isEdit && goal) {
        // Update existing goal
        await updateGoal(goal.id, {
          name: name.trim(),
          category: finalCategory,
          unit: unit.trim(),
          targetValue: target,
        })
      } else {
        // Create new goal
        const newGoal: Goal = {
          id: crypto.randomUUID(),
          name: name.trim(),
          category: finalCategory,
          unit: unit.trim(),
          startValue: start,
          targetValue: target,
          createdAt: new Date().toISOString(),
          entries: [],
        }
        await addGoal(newGoal)
      }

      // If a new category was added, ensure it's in the master list
      if (useNewCategory && newCategory.trim() && !categories.includes(newCategory.trim())) {
        await updateCategories([...categories, newCategory.trim()])
      }

      onClose()
    } catch (err) {
      alert(`Failed to save goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === '__new__') {
      setUseNewCategory(true)
      setNewCategory('')
    } else {
      setUseNewCategory(false)
      setCategory(value)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{isEdit ? 'Edit Goal' : 'Create New Goal'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="goal-name">Goal Name *</label>
            <input
              id="goal-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Weight Loss, Savings"
              maxLength={100}
              disabled={submitting}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="goal-category">Category *</label>
            <select
              id="goal-category"
              value={useNewCategory ? '__new__' : category}
              onChange={handleCategoryChange}
              disabled={submitting}
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="__new__">+ New category</option>
            </select>
            {useNewCategory && (
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
                maxLength={50}
                disabled={submitting}
                className="new-category-input"
              />
            )}
            {errors.category && <div className="field-error">{errors.category}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="goal-unit">Unit *</label>
            <input
              id="goal-unit"
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g., lbs, $, books"
              maxLength={20}
              disabled={submitting}
            />
            {errors.unit && <div className="field-error">{errors.unit}</div>}
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="goal-start">Start Value *</label>
              <input
                id="goal-start"
                type="number"
                step="any"
                value={startValue}
                onChange={e => setStartValue(e.target.value)}
                placeholder="0"
                disabled={isEdit || submitting}
              />
              {errors.startValue && <div className="field-error">{errors.startValue}</div>}
            </div>
            <div className="form-field">
              <label htmlFor="goal-target">Target Value *</label>
              <input
                id="goal-target"
                type="number"
                step="any"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="100"
                disabled={submitting}
              />
              {errors.targetValue && <div className="field-error">{errors.targetValue}</div>}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Goal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}