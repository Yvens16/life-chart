// src/api.ts
import type { AppData } from './types'

const API_BASE = '/api/data'

export async function fetchData(): Promise<AppData> {
  const response = await fetch(API_BASE)
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export async function saveData(data: AppData): Promise<void> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error(`Failed to save data: ${response.status} ${response.statusText}`)
  }
  const result = await response.json()
  if (!result.ok) {
    throw new Error('Save operation failed')
  }
}