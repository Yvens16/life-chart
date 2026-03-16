import { createContext, useContext, useState, useMemo, useRef, useEffect } from 'react'

interface Toast {
  id: number
  message: string
  type: 'error'
}

interface ToastContextValue {
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  function dismiss(id: number) {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function showError(message: string) {
    const id = ++nextId.current
    setToasts(prev => [...prev, { id, message, type: 'error' }])
    const timer = setTimeout(() => {
      timers.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
    timers.current.set(id, timer)
  }

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current.clear()
    }
  }, [])

  const contextValue = useMemo(() => ({ showError }), [showError])

  return (
    <ToastContext value={contextValue}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast--${toast.type}`}>
              <span className="toast-message">{toast.message}</span>
              <button className="toast-dismiss" onClick={() => dismiss(toast.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}
    </ToastContext>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
