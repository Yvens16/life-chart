import { LineChart, Line, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { Goal } from '../types'
import { isGoalProgressing } from '../utils/progress'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface GoalCardProps {
  goal: Goal
  progress: number
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
  onCopyForward?: () => void
  currentYear?: number
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
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(entry => ({
      date: parseLocalDate(entry.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      value: entry.value,
    }))
}

function buildYAxisDomain(goal: Goal): [number, number] {
  const allValues = [
    goal.startValue,
    goal.targetValue,
    ...goal.entries.map(e => e.value),
  ]
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const padding = (max - min) * 0.1 || 1
  return [min - padding, max + padding]
}

const STROKE_ON = 'var(--chart-1)'
const STROKE_OFF = 'var(--chart-2)'

export default function GoalCard({
  goal,
  progress,
  onClick,
  onEdit,
  onDelete,
  onCopyForward,
  currentYear,
}: GoalCardProps) {
  const progressing = isGoalProgressing(goal)
  const strokeColor = progressing ? STROKE_ON : STROKE_OFF
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

  const handleCopyForwardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCopyForward?.()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      className="cursor-pointer transition-colors hover:bg-muted/30"
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 text-left leading-snug">{goal.name}</CardTitle>
        <CardAction className="flex flex-col items-end gap-2">
          <Badge variant={progress >= 100 ? 'default' : 'secondary'}>
            {progress >= 100 ? 'Done' : `${progress.toFixed(0)}%`}
          </Badge>
          {(onEdit || onDelete) && (
            <div className="flex flex-wrap justify-end gap-1" onClick={e => e.stopPropagation()}>
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleEditClick}
                  aria-label="Edit goal"
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteClick}
                  aria-label="Delete goal"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
          {onCopyForward && (
            <div onClick={e => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleCopyForwardClick}
                aria-label={`Copy goal to ${currentYear ?? 'current year'}`}
              >
                Copy to {currentYear ?? 'current year'}
              </Button>
            </div>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
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
      </CardContent>

      <CardFooter className="flex justify-between border-t border-border pt-4 text-muted-foreground">
        <span className="truncate">{goal.unit}</span>
        <span className="shrink-0">Target: {goal.targetValue}</span>
      </CardFooter>
    </Card>
  )
}
