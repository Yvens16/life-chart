export interface Goal {
  id: string          // crypto.randomUUID()
  name: string
  category: string
  unit: string        // "lbs", "$", "books", etc.
  startValue: number
  targetValue: number
  createdAt: string   // ISO date string
  year: number        // calendar year this goal instance belongs to
  linkedGoalId?: string // points to the prior-year source goal (backward pointer)
  entries: Entry[]
}

export interface Entry {
  id: string          // crypto.randomUUID()
  date: string        // ISO date string (YYYY-MM-DD)
  value: number
}

export interface AppData {
  goals: Goal[]
  categories: string[]  // user-defined list
  promptShownForYear?: number // tracks when the new-year carry-over prompt was last shown
}
