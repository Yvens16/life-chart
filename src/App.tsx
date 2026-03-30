import { useState, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import Dashboard from './components/Dashboard'
import QuickAddModal from './components/QuickAddModal'
import NewYearModal from './components/NewYearModal'
import { useAppData } from './context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const GoalDetail = lazy(() => import('./components/GoalDetail'))

function App() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const {
    data,
    activeYear,
    setActiveYear,
    availableYears,
    currentYear,
    showNewYearPrompt,
    dismissNewYearPrompt,
  } = useAppData()

  const isCurrentYear = activeYear === currentYear
  const lastYearGoals = data?.goals.filter(g => g.year === currentYear - 1) ?? []

  return (
    <div className="flex min-h-svh flex-col">
      <header className="relative border-b border-border bg-card px-6 py-8 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Life Chart
        </h1>
        <p className="mt-2 text-muted-foreground">
          Track progress toward your life goals
        </p>
        <div className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {!isCurrentYear && (
            <span className="hidden text-xs text-muted-foreground sm:inline">Read-only</span>
          )}
          <Select
            value={String(activeYear)}
            onValueChange={v => setActiveYear(Number(v))}
          >
            <SelectTrigger size="sm" aria-label="Select year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="mx-auto box-border w-full max-w-6xl flex-1 px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/goal/:id"
            element={
              <Suspense
                fallback={
                  <div className="flex flex-col gap-4 py-20" role="status" aria-busy="true">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full rounded-lg" />
                  </div>
                }
              >
                <GoalDetail />
              </Suspense>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-border bg-card px-6 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Local-first goal tracking • Data stays on your device
        </p>
      </footer>

      {isCurrentYear && (
        <Button
          type="button"
          size="icon-lg"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
          onClick={() => setQuickAddOpen(true)}
          aria-label="Add new entry"
        >
          <span className="text-xl leading-none">+</span>
        </Button>
      )}

      {quickAddOpen && isCurrentYear && (
        <QuickAddModal open onClose={() => setQuickAddOpen(false)} />
      )}

      {showNewYearPrompt && lastYearGoals.length > 0 && (
        <NewYearModal
          open
          onClose={dismissNewYearPrompt}
          lastYearGoals={lastYearGoals}
          currentYear={currentYear}
        />
      )}
    </div>
  )
}

export default App
