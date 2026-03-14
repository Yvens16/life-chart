// src/types.ts

export interface Goal {
  id: string; // crypto.randomUUID()
  name: string;
  category: string;
  unit: string; // "lbs", "$", "books", etc.
  startValue: number;
  targetValue: number;
  createdAt: string; // ISO date string
  entries: Entry[];
}

export interface Entry {
  id: string; // crypto.randomUUID()
  date: string; // ISO date string (YYYY-MM-DD)
  value: number;
}

export interface AppData {
  goals: Goal[];
  categories: string[]; // user-defined list
}

// Helper for progress calculation (to be used in components)
export function calculateProgress(goal: Goal): number {
  if (goal.entries.length === 0) return 0;
  const latest = goal.entries[goal.entries.length - 1].value;
  const range = Math.abs(goal.targetValue - goal.startValue);
  if (range === 0) return 100;
  const distance = Math.abs(latest - goal.startValue);
  const isCorrectDirection =
    goal.targetValue > goal.startValue
      ? latest >= goal.startValue
      : latest <= goal.startValue;
  const progress = isCorrectDirection ? (distance / range) * 100 : 0;
  return Math.min(progress, 100); // cap at 100% for display
}