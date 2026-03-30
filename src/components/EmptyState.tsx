// src/components/EmptyState.tsx
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface EmptyStateProps {
  message: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export default function EmptyState({ message, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <Card className="mx-auto max-w-md border-dashed">
      <CardHeader className="text-center">
        <CardTitle className="text-base">No goals yet</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-2">
        <div
          className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl"
          aria-hidden
        >
          📊
        </div>
      </CardContent>
      {ctaLabel && onCtaClick && (
        <CardFooter className="justify-center pt-0">
          <Button type="button" onClick={onCtaClick}>
            {ctaLabel}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
