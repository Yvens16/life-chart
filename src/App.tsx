import { useState } from 'react'
import { Routes, Route } from 'react-router'
import Dashboard from './components/Dashboard'
import GoalDetail from './components/GoalDetail'
import QuickAddModal from './components/QuickAddModal'
import { Button } from '@/components/ui/button'

function App() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-card px-6 py-8 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Life Chart
        </h1>
        <p className="mt-2 text-muted-foreground">
          Track progress toward your life goals
        </p>
      </header>
      <main className="mx-auto box-border w-full max-w-6xl flex-1 px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goal/:id" element={<GoalDetail />} />
        </Routes>
      </main>
      <footer className="border-t border-border bg-card px-6 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Local-first goal tracking • Data stays on your device
        </p>
      </footer>

      <Button
        type="button"
        size="icon-lg"
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Add new entry"
      >
        <span className="text-xl leading-none">+</span>
      </Button>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}

export default App
