import { LineChart, Line, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { Goal } from '../types'
import { isGoalProgressing } from '../utils/progress'
import './GoalCard.css'

interface GoalCardProps {
  goal: Goal
  progress: number // 0-100
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}

/** Parse a YYYY-MM-DD string as local midnight (not UTC midnight). */
function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

function buildChartData(goal: Goal) {
  if (goal.entries.length === 0) {
    return [{ date: 'Start', value: goal.startValue }]
  }
  return [...goal.entries]
    .sort((a, b) => a.date < b.date ? -1 : 1)
    .map(entry => ({
      date: parseLocalDate(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: entry.value,
    }))
}

/**
 * Compute a YAxis domain that covers all entry values, startValue, and targetValue
 * so the ReferenceLine for target is always visible within the chart area.
 */
function buildYAxisDomain(goal: Goal): [number, number] {
  const allValues = [
    goal.startValue,
    goal.targetValue,
    ...goal.entries.map(e => e.value),
  ]
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const padding = (max - min) * 0.1 || 1 // at least 1 unit of padding
  return [min - padding, max + padding]
}

export default function GoalCard({ goal, progress, onClick, onEdit, onDelete }: GoalCardProps) {
  const progressing = isGoalProgressing(goal)
  const strokeColor = progressing ? '#10b981' : '#ef4444' // green-500, red-500
  const chartData = buildChartData(goal)
  const yAxisDomain = buildYAxisDomain(goal)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  return (
    <div className="goal-card" onClick={onClick}>
      <div className="goal-card-header">
        <h3 className="goal-card-title">{goal.name}</h3>
        <div className="goal-card-header-right">
          <div className={`goal-card-progress${progress >= 100 ? ' goal-card-progress--complete' : ''}`}>
            {progress >= 100 ? '✓ Done' : `${progress.toFixed(0)}%`}
          </div>
          {(onEdit || onDelete) && (
            <div className="goal-card-actions" onClick={e => e.stopPropagation()}>
              {onEdit && (
                <button className="goal-card-action-btn goal-card-edit-btn" onClick={handleEditClick} aria-label="Edit goal">
                  Edit
                </button>
              )}
              {onDelete && (
                <button className="goal-card-action-btn goal-card-delete-btn" onClick={handleDeleteClick} aria-label="Delete goal">
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="goal-card-chart">
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <YAxis domain={yAxisDomain} hide />
            <ReferenceLine
              y={goal.targetValue}
              stroke={strokeColor}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="goal-card-footer">
        <span className="goal-card-unit">{goal.unit}</span>
        <span className="goal-card-target">Target: {goal.targetValue}</span>
      </div>
    </div>
  )
}
