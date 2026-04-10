import { PLAN_LABELS } from '../hooks/usePlanLimits'
import type { PlanKey } from '../hooks/usePlanLimits'

export function PlanBadge({ plan }: { plan: string }) {
  const meta = PLAN_LABELS[plan as PlanKey] ?? PLAN_LABELS.free
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}
