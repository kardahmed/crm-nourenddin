import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanLimit {
  plan: PlanKey
  max_agents: number
  max_projects: number
  max_units: number
  max_clients: number
  max_storage_mb: number
  features: Record<string, boolean>
  price_monthly: number
}

export const PLAN_LABELS: Record<PlanKey, { label: string; color: string; bg: string }> = {
  free:       { label: 'Free',       color: 'text-[#7F96B7]', bg: 'bg-[#7F96B7]/10' },
  starter:    { label: 'Starter',    color: 'text-[#3782FF]', bg: 'bg-[#3782FF]/10' },
  pro:        { label: 'Pro',        color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/10' },
  enterprise: { label: 'Enterprise', color: 'text-[#FF9A1E]', bg: 'bg-[#FF9A1E]/10' },
}

export function usePlanLimits() {
  return useQuery({
    queryKey: ['plan-limits'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plan_limits').select('*').order('price_monthly')
      if (error) throw error
      return data as PlanLimit[]
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  })
}

export function formatPlanPrice(price: number): string {
  if (price === 0) return 'Gratuit'
  return `${(price / 100).toLocaleString('fr')} DA/mois`
}
