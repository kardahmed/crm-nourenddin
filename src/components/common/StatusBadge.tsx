const VARIANTS = {
  green: 'border-immo-accent-green/30 bg-immo-accent-green/10 text-immo-accent-green',
  blue: 'border-immo-accent-blue/30 bg-immo-accent-blue/10 text-immo-accent-blue',
  orange: 'border-immo-status-orange/30 bg-immo-status-orange/10 text-immo-status-orange',
  red: 'border-immo-status-red/30 bg-immo-status-red/10 text-immo-status-red',
  muted: 'border-immo-text-muted/30 bg-immo-text-muted/10 text-immo-text-muted',
} as const

interface StatusBadgeProps {
  label: string
  type?: keyof typeof VARIANTS
}

export function StatusBadge({ label, type = 'muted' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${VARIANTS[type]}`}
    >
      {label}
    </span>
  )
}
