import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-immo-border-default pb-4">
      <div>
        <h2 className="text-xl font-bold text-immo-text-primary">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-immo-text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
