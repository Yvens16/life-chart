import { useState, useEffect } from 'react'
import type { Entry } from '../types'
import { useAppData } from '../context/AppDataContext'
import { getErrorMessage } from '../utils/errors'
import './QuickAddModal.css'

interface QuickAddModalProps {
  open: boolean
  onClose: () => void
}

export default function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const { data, addEntry } = useAppData()
  const goals = data?.goals ?? []
  const filteredGoals = goals.filter(goal =>
    goal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    goal.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize date to today (YYYY-MM-DD format)
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
      setSelectedGoalId('')
      setValue('')
      setErrors({})
    }
  }, [open])

  if (!open) return null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedGoalId) {
      newErrors.goal = 'Please select a goal'
    }

    const numValue = parseFloat(value)
    if (value.trim() === '') {
      newErrors.value = 'Value is required'
    } else if (isNaN(numValue)) {
      newErrors.value = 'Value must be a number'
    } else if (!Number.isFinite(numValue)) {
      newErrors.value = 'Value must be finite'
    }

    if (!date) {
      newErrors.date = 'Date is required'
    } else {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate > today) {
        newErrors.date = 'Date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const selectedGoal = goals.find(g => g.id === selectedGoalId)
      if (!selectedGoal) {
        throw new Error('Selected goal not found')
      }

      const newEntry: Entry = {
        id: crypto.randomUUID(),
        date,
        value: parseFloat(value),
      }

      await addEntry(selectedGoalId, newEntry)
      onClose()
    } catch (err) {
      alert(`Failed to add entry: ${getErrorMessage(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  // If there are no goals, show empty state
  if (goals.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <header className="modal-header">
            <h2>Add Entry</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </header>
          <div className="empty-state">
            <p>You haven't created any goals yet.</p>
            <p>Create a goal first to start tracking entries.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Add Entry</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="goal-select">Goal *</label>
            {goals.length >= 10 ? (
              <div className="searchable-dropdown">
                <input
                  type="text"
                  placeholder="Search goals by name or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={submitting}
                />
                <ul>
                  {filteredGoals.map(goal => (
                    <li
                      key={goal.id}
                      onClick={() => {
                        setSelectedGoalId(goal.id)
                        setSearchQuery('')
                      }}
                      className={selectedGoalId === goal.id ? 'selected' : ''}
                    >
                      {goal.name} ({goal.category}) — Current: {goal.entries.length > 0 ? goal.entries[goal.entries.length - 1].value : goal.startValue} {goal.unit}
                    </li>
                  ))}
                </ul>
                {filteredGoals.length === 0 && (
                  <div className="dropdown-empty">No goals match your search</div>
                )}
              </div>
            ) : (
              <select
                id="goal-select"
                value={selectedGoalId}
                onChange={e => setSelectedGoalId(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select a goal</option>
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name} ({goal.category}) — Current: {goal.entries.length > 0 ? goal.entries[goal.entries.length - 1].value : goal.startValue} {goal.unit}
                  </option>
                ))}
              </select>
            )}
            {errors.goal && <div className="field-error">{errors.goal}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="entry-value">Value *</label>
            <input
              id="entry-value"
              type="number"
              step="any"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter value"
              disabled={submitting}
            />
            {errors.value && <div className="field-error">{errors.value}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="entry-date">Date *</label>
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={submitting}
            />
            {errors.date && <div className="field-error">{errors.date}</div>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}