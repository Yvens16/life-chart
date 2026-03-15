import { LineChart, Line, ReferenceLine, ResponsiveContainer } from 'recharts'
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

function buildChartData(goal: Goal) {
  if (goal.entries.length === 0) {
    return [{ date: 'Start', value: goal.startValue }]
  }
  return [...goal.entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: entry.value,
    }))
}

export default function GoalCard({ goal, progress, onClick, onEdit, onDelete }: GoalCardProps) {
  const progressing = isGoalProgressing(goal)
  const strokeColor = progressing ? '#10b981' : '#ef4444' // green-500, red-500
  const chartData = buildChartData(goal)

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
          <div className="goal-card-progress">{progress.toFixed(0)}%</div>
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
