import { AlertTriangle } from 'lucide-react'

interface Props {
  type: 'agents' | 'projects' | 'units' | 'clients'
  current: number
  max: number
}

const TYPE_LABELS: Record<string, string> = {
  agents: 'agents',
  projects: 'projets',
  units: 'unites',
  clients: 'clients',
}

export function PlanLimitBanner({ type, current, max }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-immo-status-orange/30 bg-immo-status-orange/5 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-immo-status-orange" />
      <div className="flex-1">
        <p className="text-sm font-medium text-immo-text-primary">
          Limite atteinte : {current}/{max} {TYPE_LABELS[type]}
        </p>
        <p className="text-xs text-immo-text-muted">
          Passez a un plan superieur pour ajouter plus de {TYPE_LABELS[type]}.
        </p>
      </div>
      <a
        href="/settings"
        className="shrink-0 rounded-md bg-immo-accent-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-immo-accent-green/90 transition-colors"
      >
        Upgrader
      </a>
    </div>
  )
}
