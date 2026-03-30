import { useEffect, useState } from 'react'
import type { Entry } from '../types'
import { useAppData } from '../context/AppDataContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/errors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QuickAddModalProps {
  open: boolean
  onClose: () => void
}

const SEARCHABLE_THRESHOLD = 10

export default function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const { data, addEntry } = useAppData()
  const { showError } = useToast()
  const goals = data?.goals ?? []

  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showList, setShowList] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const filteredGoals = goals.filter(
    goal =>
      goal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today ?? '')
      setSelectedGoalId('')
      setValue('')
      setSearchQuery('')
      setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedGoalId) {
      newErrors.goal = 'Please select a goal'
    }

    const numValue = Number(value.trim())
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
      const selectedDate = new Date(date + 'T00:00:00')
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
        value: Number(value.trim()),
      }

      await addEntry(selectedGoalId, newEntry)
      onClose()
    } catch (err) {
      showError(`Failed to add entry: ${getErrorMessage(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const emptyGoalsBody = (
    <div className="flex flex-col gap-2 py-2 text-center text-sm text-muted-foreground">
      <p>You haven&apos;t created any goals yet.</p>
      <p>Create a goal first to start tracking entries.</p>
    </div>
  )

  const formBody = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-select">Goal *</Label>
        {goals.length >= SEARCHABLE_THRESHOLD ? (
          <div className="relative flex flex-col gap-1">
            <Input
              id="goal-select"
              type="text"
              placeholder="Search goals by name or category..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setShowList(true)
              }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              disabled={submitting}
              aria-invalid={!!errors.goal}
            />
            {showList && filteredGoals.length > 0 && (
              <ul
                className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
                role="listbox"
              >
                {filteredGoals.map(goal => (
                  <li
                    key={goal.id}
                    role="option"
                    aria-selected={selectedGoalId === goal.id}
                    className={`cursor-pointer px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground ${
                      selectedGoalId === goal.id ? 'bg-accent text-accent-foreground' : ''
                    }`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setSelectedGoalId(goal.id)
                      setSearchQuery(goal.name)
                      setShowList(false)
                    }}
                  >
                    {goal.name} ({goal.category}) — Current:{' '}
                    {goal.entries.length > 0
                      ? goal.entries[goal.entries.length - 1].value
                      : goal.startValue}{' '}
                    {goal.unit}
                  </li>
                ))}
              </ul>
            )}
            {showList && filteredGoals.length === 0 && (
              <p className="text-xs text-muted-foreground">No goals match your search</p>
            )}
          </div>
        ) : (
          <Select
            value={selectedGoalId || undefined}
            onValueChange={setSelectedGoalId}
            disabled={submitting}
          >
            <SelectTrigger id="goal-select" className="w-full">
              <SelectValue placeholder="Select a goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {goals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name} ({goal.category}) — Current:{' '}
                    {goal.entries.length > 0
                      ? goal.entries[goal.entries.length - 1].value
                      : goal.startValue}{' '}
                    {goal.unit}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        {errors.goal && (
          <p className="text-xs text-destructive" role="alert">
            {errors.goal}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-value">Value *</Label>
        <Input
          id="entry-value"
          type="number"
          step="any"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter value"
          disabled={submitting}
          aria-invalid={!!errors.value}
        />
        {errors.value && (
          <p className="text-xs text-destructive" role="alert">
            {errors.value}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-date">Date *</Label>
        <Input
          id="entry-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          disabled={submitting}
          aria-invalid={!!errors.date}
        />
        {errors.date && (
          <p className="text-xs text-destructive" role="alert">
            {errors.date}
          </p>
        )}
      </div>

      <DialogFooter className="gap-2 pt-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add entry'}
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add entry</DialogTitle>
          <DialogDescription>Log a new data point for one of your goals.</DialogDescription>
        </DialogHeader>
        {goals.length === 0 ? emptyGoalsBody : formBody}
      </DialogContent>
    </Dialog>
  )
}
