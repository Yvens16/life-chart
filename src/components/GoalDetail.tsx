import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router'
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
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { calculateProgress, isGoalProgressing } from '../utils/progress'
import { groupEntriesByWeek, formatWeekLabel } from '../utils/weekAggregation'
import { getErrorMessage } from '../utils/errors'
import { buildGoalChain, getFinalEntryValue, computeProgressPercent } from '../utils/goalChain'
import CreateGoalModal from './CreateGoalModal'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/** Parse a YYYY-MM-DD string as local midnight (not UTC midnight). */
function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

const STROKE_ON = 'var(--chart-1)'
const STROKE_OFF = 'var(--chart-2)'

export default function GoalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error, deleteEntry, updateEntry, deleteGoal, activeYear, currentYear } = useAppData()
  const { showError } = useToast()
  const isCurrentYear = activeYear === currentYear
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-20"
        role="status"
        aria-busy="true"
      >
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-56" />
        <span className="text-sm text-muted-foreground">Loading goal details...</span>
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

  const goal = data?.goals.find(g => g.id === id)
  if (!goal) {
    return <Navigate to="/" replace />
  }

  const progress = calculateProgress(goal)
  const progressing = isGoalProgressing(goal)
  const strokeColor = progressing ? STROKE_ON : STROKE_OFF

  const allGoals = data?.goals ?? []
  const goalChain = buildGoalChain(goal, allGoals)
  const showHistory = goalChain.length > 1

  const weeklyData = groupEntriesByWeek(goal.entries)
  const chartData =
    weeklyData.length > 0
      ? weeklyData.map(d => ({
          week: d.week,
          weekLabel: formatWeekLabel(d.week),
          value: d.value,
        }))
      : [{ week: 'Start', weekLabel: 'Start', value: goal.startValue }]

  const sortedEntries = [...goal.entries].sort((a, b) => b.date.localeCompare(a.date))

  const handleDeleteEntry = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(goal.id, entryId).catch(err => {
        showError(`Failed to delete entry: ${getErrorMessage(err)}`)
      })
    }
  }

  const handleDeleteGoal = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this goal? This will also delete all its entries.'
      )
    ) {
      return
    }
    try {
      await deleteGoal(goal.id)
      navigate('/')
    } catch (err) {
      showError(`Failed to delete goal: ${getErrorMessage(err)}`)
    }
  }

  const startEditEntry = (entryId: string) => {
    const entry = goal.entries.find(e => e.id === entryId)
    if (!entry) return
    setEditingEntryId(entryId)
    setEditValue(entry.value.toString())
    setEditDate(entry.date)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingEntryId(null)
    setEditValue('')
    setEditDate('')
    setEditError(null)
  }

  const saveEdit = async () => {
    if (!editingEntryId) return

    const value = parseFloat(editValue)
    if (!Number.isFinite(value)) {
      setEditError('Please enter a valid finite number')
      return
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(editDate)) {
      setEditError('Date is required (YYYY-MM-DD)')
      return
    }
    const parsedDate = parseLocalDate(editDate)
    if (isNaN(parsedDate.getTime())) {
      setEditError('Invalid date — please enter a real calendar date')
      return
    }

    setEditError(null)
    try {
      await updateEntry(goal.id, editingEntryId, { date: editDate, value })
      setEditingEntryId(null)
    } catch (err) {
      showError(`Failed to update entry: ${getErrorMessage(err)}`)
    }
  }

  const gridStroke = 'oklch(0.22 0 0)'
  const axisColor = 'oklch(0.55 0 0)'

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="ghost"
          className="w-fit px-0 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/')}
        >
          ← Back to dashboard
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              {goal.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{goal.category}</Badge>
              <Badge variant="outline">{progress.toFixed(0)}% progress</Badge>
              <span className="text-sm text-muted-foreground">{goal.unit}</span>
            </div>
          </div>
          {isCurrentYear && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                Edit
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleDeleteGoal}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress over time</CardTitle>
          <CardDescription>Weekly aggregated values and target reference</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="weekLabel" stroke={axisColor} tick={{ fill: axisColor }} />
              <YAxis
                stroke={axisColor}
                tick={{ fill: axisColor }}
                label={{ value: goal.unit, angle: -90, position: 'insideLeft', fill: axisColor }}
              />
              <Tooltip
                formatter={v => [v, goal.unit]}
                labelFormatter={label => `Week: ${label}`}
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={goal.targetValue}
                stroke={strokeColor}
                strokeDasharray="3 3"
                label="Target"
              />
              <ReferenceLine
                y={goal.startValue}
                stroke={axisColor}
                strokeDasharray="2 2"
                label="Start"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={3}
                dot={{ r: 4 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>
            {isCurrentYear ? 'Newest first — edit or remove logged values' : 'Newest first — read-only view'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 px-0 pb-0">
          {sortedEntries.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No entries yet. Log your first entry to start tracking.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sortedEntries.map(entry => (
                <li key={entry.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  {isCurrentYear && editingEntryId === entry.id ? (
                    <div className="flex w-full flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          className="sm:max-w-[10rem]"
                        />
                        <Input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          placeholder="Value"
                          className="sm:max-w-[10rem]"
                        />
                      </div>
                      {editError && (
                        <p className="text-xs text-destructive" role="alert">
                          {editError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                        <span className="text-sm font-medium text-foreground">
                          {parseLocalDate(entry.date).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {entry.value} {goal.unit}
                        </span>
                      </div>
                      {isCurrentYear && (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEditEntry(entry.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>History across years</CardTitle>
            <CardDescription>Progress on this goal over multiple years</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Year</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Target</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Final value</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {goalChain.map(chainGoal => {
                  const finalValue = getFinalEntryValue(chainGoal)
                  const pct = finalValue !== null ? computeProgressPercent(chainGoal, finalValue) : null
                  const isActive = chainGoal.id === goal.id
                  return (
                    <tr
                      key={chainGoal.id}
                      className={isActive ? 'bg-muted/30' : undefined}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {chainGoal.year}
                        {isActive && (
                          <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {chainGoal.targetValue} {chainGoal.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {finalValue !== null ? `${finalValue} ${chainGoal.unit}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pct !== null ? (
                          <span className={pct >= 100 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                            {pct.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {isCurrentYear && (
        <CreateGoalModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          goal={goal}
        />
      )}
    </div>
  )
}
