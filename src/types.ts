export interface Goal {
  id: string          // crypto.randomUUID()
  name: string
  category: string
  unit: string        // "lbs", "$", "books", etc.
  startValue: number
  targetValue: number
  createdAt: string   // ISO date string
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
}
