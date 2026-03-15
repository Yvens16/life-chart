import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useAppData } from '../hooks/useAppData'
import { calculateProgress, isGoalProgressing } from '../utils/progress'
import { groupEntriesByWeek, formatWeekLabel } from '../utils/weekAggregation'
import './GoalDetail.css'

export default function GoalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error, deleteEntry, updateEntry } = useAppData()
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState('')

  if (loading) {
    return <div className="goal-detail-loading">Loading goal details...</div>
  }

  if (error) {
    return (
      <div className="goal-detail-error">
        <p>Error loading data: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  const goal = data?.goals.find(g => g.id === id)
  if (!goal) {
    // Redirect to dashboard if goal not found
    navigate('/')
    return null
  }

  const progress = calculateProgress(goal)
  const progressing = isGoalProgressing(goal)
  const strokeColor = progressing ? '#10b981' : '#ef4444' // green-500, red-500

  // Prepare chart data (weekly aggregated)
  const weeklyData = groupEntriesByWeek(goal.entries)
  const chartData = weeklyData.length > 0
    ? weeklyData.map(d => ({
        week: d.week,
        weekLabel: formatWeekLabel(d.week),
        value: d.value,
      }))
    : [{ week: 'Start', weekLabel: 'Start', value: goal.startValue }]

  // Sort entries by date descending for the list (newest first)
  const sortedEntries = [...goal.entries].sort((a, b) => b.date.localeCompare(a.date))

  const handleDeleteEntry = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(goal.id, entryId).catch(err => {
        alert(`Failed to delete entry: ${err.message}`)
      })
    }
  }

  const startEditEntry = (entryId: string) => {
    const entry = goal.entries.find(e => e.id === entryId)
    if (!entry) return
    setEditingEntryId(entryId)
    setEditValue(entry.value.toString())
    setEditDate(entry.date)
  }

  const cancelEdit = () => {
    setEditingEntryId(null)
    setEditValue('')
    setEditDate('')
  }

  const saveEdit = async () => {
    if (!editingEntryId) return
    const value = parseFloat(editValue)
    if (isNaN(value)) {
      alert('Please enter a valid number')
      return
    }
    try {
      await updateEntry(goal.id, editingEntryId, { date: editDate, value })
      setEditingEntryId(null)
    } catch (err) {
      alert(`Failed to update entry: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="goal-detail">
      <header className="goal-detail-header">
        <button className="goal-detail-back-btn" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1 className="goal-detail-title">{goal.name}</h1>
        <div className="goal-detail-meta">
          <span className="goal-detail-category">{goal.category}</span>
          <span className="goal-detail-progress">{progress.toFixed(0)}% progress</span>
          <span className="goal-detail-unit">{goal.unit}</span>
        </div>
      </header>

      <div className="goal-detail-chart-section">
        <h2>Progress Over Time</h2>
        <div className="goal-detail-chart">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="weekLabel"
                stroke="#6b7280"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: '#6b7280' }}
                label={{ value: goal.unit, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [value, goal.unit]}
                labelFormatter={(label) => `Week: ${label}`}
              />
              <ReferenceLine
                y={goal.targetValue}
                stroke={strokeColor}
                strokeDasharray="3 3"
                label="Target"
              />
              <ReferenceLine
                y={goal.startValue}
                stroke="#9ca3af"
                strokeDasharray="2 2"
                label="Start"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={3}
                dot={{ r: 4 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="goal-detail-entries-section">
        <h2>Entries</h2>
        {sortedEntries.length === 0 ? (
          <div className="goal-detail-empty-entries">
            <p>No entries yet. Log your first entry to start tracking!</p>
          </div>
        ) : (
          <ul className="goal-detail-entries-list">
            {sortedEntries.map(entry => (
              <li key={entry.id} className="goal-detail-entry">
                {editingEntryId === entry.id ? (
                  <div className="entry-edit-form">
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                    />
                    <input
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder="Value"
                    />
                    <button onClick={saveEdit}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="entry-info">
                      <span className="entry-date">{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="entry-value">{entry.value} {goal.unit}</span>
                    </div>
                    <div className="entry-actions">
                      <button onClick={() => startEditEntry(entry.id)}>Edit</button>
                      <button onClick={() => handleDeleteEntry(entry.id)}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}