import { LineChart, Line, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { Goal } from '../types'
import { isGoalProgressing } from '../utils/progress'
import './GoalCard.css'

interface GoalCardProps {
  goal: Goal
  progress: number // 0-100
  onClick: () => void
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

export default function GoalCard({ goal, progress, onClick }: GoalCardProps) {
  const progressing = isGoalProgressing(goal)
  const strokeColor = progressing ? '#10b981' : '#ef4444' // green-500, red-500
  const chartData = buildChartData(goal)

  return (
    <div className="goal-card" onClick={onClick}>
      <div className="goal-card-header">
        <h3 className="goal-card-title">{goal.name}</h3>
        <div className="goal-card-progress">{progress.toFixed(0)}%</div>
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
