import { useEffect, useState } from 'react'
import type { Goal } from '../types'
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

interface CreateGoalModalProps {
  open: boolean
  onClose: () => void
  goal?: Goal
}

export default function CreateGoalModal({ open, onClose, goal }: CreateGoalModalProps) {
  const { data, mutate } = useAppData()
  const { showError } = useToast()
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

  useEffect(() => {
    if (!open) return
    if (goal) {
      setName(goal.name)
      setCategory(goal.category)
      setNewCategory('')
      setUseNewCategory(false)
      setUnit(goal.unit)
      setStartValue(goal.startValue.toString())
      setTargetValue(goal.targetValue.toString())
    } else {
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = 'Goal name is required'
    else if (name.length > 100) newErrors.name = 'Name must be 100 characters or less'

    const finalCategory = useNewCategory ? newCategory.trim() : category
    if (!finalCategory) newErrors.category = 'Category is required'
    else if (finalCategory.length > 50) newErrors.category = 'Category must be 50 characters or less'

    if (!unit.trim()) newErrors.unit = 'Unit is required'
    else if (unit.length > 20) newErrors.unit = 'Unit must be 20 characters or less'

    const start = Number(startValue.trim())
    if (isNaN(start)) newErrors.startValue = 'Start value must be a number'
    else if (!Number.isFinite(start)) newErrors.startValue = 'Start value must be finite'

    const target = Number(targetValue.trim())
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
      if (!data) throw new Error('Data not loaded')

      const finalCategory = useNewCategory ? newCategory.trim() : category
      const start = Number(startValue.trim())
      const target = Number(targetValue.trim())

      const updatedCategories =
        useNewCategory && newCategory.trim() && !categories.includes(newCategory.trim())
          ? [...categories, newCategory.trim()]
          : categories

      let updatedGoals
      if (isEdit && goal) {
        updatedGoals = data.goals.map(g =>
          g.id === goal.id
            ? {
                ...g,
                name: name.trim(),
                category: finalCategory,
                unit: unit.trim(),
                targetValue: target,
              }
            : g
        )
      } else {
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
        updatedGoals = [...data.goals, newGoal]
      }

      await mutate({
        ...data,
        goals: updatedGoals,
        categories: updatedCategories,
      })

      onClose()
    } catch (err) {
      showError(`Failed to save goal: ${getErrorMessage(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const categorySelectValue = useNewCategory ? '__new__' : category || undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your goal details below.'
              : 'Define a goal and how you will measure progress.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-name">Goal name *</Label>
            <Input
              id="goal-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Weight loss, savings"
              maxLength={100}
              disabled={submitting}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-category">Category *</Label>
            <Select
              value={categorySelectValue}
              onValueChange={v => {
                if (v === '__new__') {
                  setUseNewCategory(true)
                  setNewCategory('')
                } else {
                  setUseNewCategory(false)
                  setCategory(v)
                }
              }}
              disabled={submitting}
            >
              <SelectTrigger id="goal-category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">+ New category</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {useNewCategory && (
              <Input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="New category name"
                maxLength={50}
                disabled={submitting}
              />
            )}
            {errors.category && (
              <p className="text-xs text-destructive" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-unit">Unit *</Label>
            <Input
              id="goal-unit"
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g., lbs, $, books"
              maxLength={20}
              disabled={submitting}
              aria-invalid={!!errors.unit}
            />
            {errors.unit && (
              <p className="text-xs text-destructive" role="alert">
                {errors.unit}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-start">Start value *</Label>
              <Input
                id="goal-start"
                type="number"
                step="any"
                value={startValue}
                onChange={e => setStartValue(e.target.value)}
                placeholder="0"
                disabled={isEdit || submitting}
                aria-invalid={!!errors.startValue}
              />
              {errors.startValue && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.startValue}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Target value *</Label>
              <Input
                id="goal-target"
                type="number"
                step="any"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="100"
                disabled={submitting}
                aria-invalid={!!errors.targetValue}
              />
              {errors.targetValue && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.targetValue}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
