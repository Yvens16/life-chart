import { Routes, Route } from 'react-router'
import './App.css'
import Dashboard from './components/Dashboard'
import GoalDetail from './components/GoalDetail'

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
