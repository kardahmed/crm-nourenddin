import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-immo-text-muted">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold text-immo-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-immo-text-muted">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5 bg-immo-accent-green text-sm font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
