// src/components/EmptyState.tsx
import './EmptyState.css'

interface EmptyStateProps {
  message: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export default function EmptyState({ message, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📊</div>
      <p className="empty-state-message">{message}</p>
      {ctaLabel && onCtaClick && (
        <button className="empty-state-cta" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      )}
    </div>
  )
}