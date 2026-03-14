import { Routes, Route } from 'react-router'
import './App.css'

// Placeholder components for Phase 1
// Will be replaced with actual implementations in later phases
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Goal progress tracker dashboard will appear here.</p>
      <p>Phase 2 will implement the dashboard view.</p>
    </div>
  )
}

function GoalDetail() {
  return (
    <div>
      <h1>Goal Detail</h1>
      <p>Goal detail page with chart and entry management will appear here.</p>
      <p>Phase 3 will implement the detail view.</p>
    </div>
  )
}

function App() {
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
    </div>
  )
}

export default App
