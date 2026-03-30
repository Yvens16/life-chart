import { useState } from 'react'
import type { Goal } from '../types'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NewYearModalProps {
  open: boolean
  onClose: () => void
  lastYearGoals: Goal[]
  currentYear: number
}

/** Returns the value of the entry with the latest date, or null if no entries. */
function getFinalValue(goal: Goal): number | null {
  if (goal.entries.length === 0) return null
  return goal.entries.reduce((best, e) =>
    e.date.localeCompare(best.date) > 0 ? e : best
  ).value
}

export default function NewYearModal({ open, onClose, lastYearGoals, currentYear }: NewYearModalProps) {
  const { carryForwardGoals } = useAppData()
  const { showError } = useToast()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(lastYearGoals.map(g => g.id))
  )
  const [targetValues, setTargetValues] = useState<Record<string, string>>(
    () => Object.fromEntries(lastYearGoals.map(g => [g.id, String(g.targetValue)]))
  )
  const [submitting, setSubmitting] = useState(false)

  const toggleGoal = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    const selected = lastYearGoals.filter(g => selectedIds.has(g.id))
    if (selected.length === 0) {
      onClose()
      return
    }

    const parsedTargets = selected.map(g => {
      const raw = targetValues[g.id] ?? String(g.targetValue)
      const n = Number(raw.trim())
      return Number.isFinite(n) ? n : g.targetValue
    })

    setSubmitting(true)
    try {
      await carryForwardGoals(selected, parsedTargets)
      onClose()
    } catch (err) {
      showError(`Failed to carry over goals: ${getErrorMessage(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>New year, new goals! 🎯</DialogTitle>
          <DialogDescription>
            Select the goals you&apos;d like to carry into {currentYear}. You can adjust
            targets before confirming.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col divide-y divide-border">
          {lastYearGoals.map(goal => {
            const finalValue = getFinalValue(goal)
            const isChecked = selectedIds.has(goal.id)
            return (
              <li key={goal.id} className="flex flex-col gap-3 py-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleGoal(goal.id)}
                    disabled={submitting}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {goal.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {goal.category} · {goal.unit}
                      {finalValue !== null && (
                        <> · {currentYear - 1} final: {finalValue} {goal.unit}</>
                      )}
                    </p>
                  </div>
                </label>
                {isChecked && (
                  <div className="ml-7 flex items-center gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Target for {currentYear}:
                    </span>
                    <Input
                      type="number"
                      step="any"
                      value={targetValues[goal.id] ?? String(goal.targetValue)}
                      onChange={e =>
                        setTargetValues(prev => ({ ...prev, [goal.id]: e.target.value }))
                      }
                      disabled={submitting}
                      className="h-7 max-w-32 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">{goal.unit}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <DialogFooter className="gap-2 pt-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? 'Carrying over...'
              : `Carry over ${selectedIds.size} goal${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
