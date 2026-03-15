import { useState } from 'react'
import { Routes, Route } from 'react-router'
import './App.css'
import Dashboard from './components/Dashboard'
import GoalDetail from './components/GoalDetail'
import QuickAddModal from './components/QuickAddModal'
import './components/QuickAddModal.css'

function App() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Life Chart</h1>
        <p>Track progress toward your life goals</p>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goal/:id" element={<GoalDetail />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>Local-first goal tracking • Data stays on your device</p>
      </footer>

      {/* Floating Action Button */}
      <button
        className="fab"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Add new entry"
      >
        +
      </button>

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  )
}

export default App
