import { useQuery } from '@tanstack/react-query'
import { Users, Calendar, DollarSign, Target, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { KPICard } from '@/components/common'
import { formatPriceCompact } from '@/lib/constants'
import { format, isToday, isTomorrow, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'

function useAgentKPIs(userId: string | undefined) {
  return useQuery({
    queryKey: ['agent-dashboard-kpis', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('Missing context')
      const todayStart = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [clientsCount, todayVisitsCount, monthSales, goalsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('agent_id', userId),
        supabase.from('visits').select('id', { count: 'exact', head: true })
          .eq('agent_id', userId)
          .gte('scheduled_at', todayStart)
          .lte('scheduled_at', todayStart + 'T23:59:59')
          .neq('status', 'cancelled'),
        supabase.from('sales').select('final_price').eq('agent_id', userId).eq('status', 'active').gte('created_at', monthStart),
        supabase.from('agent_goals').select('target_sales_count').eq('agent_id', userId).limit(1).maybeSingle(),
      ])

      const sales = (monthSales.data ?? []) as Array<{ final_price: number }>
      return {
        totalClients: clientsCount.count ?? 0,
        todayVisits: todayVisitsCount.count ?? 0,
        monthRevenue: sales.reduce((sum, s) => sum + (s.final_price ?? 0), 0),
        monthSales: sales.length,
        goalTarget: (goalsRes.data as { target_sales_count: number } | null)?.target_sales_count ?? null,
      }
    },
  })
}

function useUpcomingVisits(userId: string | undefined) {
  return useQuery({
    queryKey: ['agent-dashboard-visits', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('Missing context')
      const { data } = await supabase
        .from('visits')
        .select('id, scheduled_at, status, clients(full_name)')
        .eq('agent_id', userId)
        .gte('scheduled_at', new Date().toISOString().split('T')[0])
        .neq('status', 'cancelled')
        .order('scheduled_at')
        .limit(10)
      const visits = (data ?? []) as Array<{ id: string; scheduled_at: string; status: string; clients: { full_name: string } | null }>
      return visits.filter(v => isAfter(new Date(v.scheduled_at), new Date()))
    },
  })
}

function useClientsToRelaunch(userId: string | undefined) {
  return useQuery({
    queryKey: ['agent-dashboard-relaunch', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('Missing context')
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, last_contact_at, confirmed_budget, pipeline_stage')
        .eq('agent_id', userId)
        .not('pipeline_stage', 'in', '(vente,perdue)')
        .or(`last_contact_at.is.null,last_contact_at.lt.${threeDaysAgo}`)
        .order('last_contact_at', { ascending: true, nullsFirst: true })
        .limit(5)
      return (data ?? []) as Array<{ id: string; full_name: string; last_contact_at: string | null; confirmed_budget: number | null }>
    },
  })
}

export function AgentDashboard() {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.session?.user?.id)

  const kpis = useAgentKPIs(userId)
  const visits = useUpcomingVisits(userId)
  const relaunch = useClientsToRelaunch(userId)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label={t('agent_dashboard.my_clients')} value={kpis.isLoading ? '—' : kpis.data?.totalClients ?? 0} accent="blue" icon={<Users className="h-5 w-5 text-immo-accent-blue" />} />
        <KPICard label={t('agent_dashboard.visits_today')} value={kpis.isLoading ? '—' : kpis.data?.todayVisits ?? 0} accent="orange" icon={<Calendar className="h-5 w-5 text-immo-status-orange" />} />
        <KPICard label={t('agent_dashboard.revenue_month')} value={kpis.isLoading ? '—' : formatPriceCompact(kpis.data?.monthRevenue ?? 0)} accent="green" icon={<DollarSign className="h-5 w-5 text-immo-accent-green" />} />
        <KPICard label={t('agent_dashboard.sales_month')} value={kpis.isLoading ? '—' : kpis.data?.monthSales ?? 0} accent="green" subtitle={kpis.data?.goalTarget ? `Objectif: ${kpis.data.goalTarget}` : undefined} icon={<Target className="h-5 w-5 text-immo-accent-green" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card shadow-sm">
          <div className="border-b border-immo-border-default px-5 py-4">
            <h3 className="text-sm font-semibold text-immo-text-primary">{t('agent_dashboard.next_visits')}</h3>
          </div>
          <div className="max-h-[300px] divide-y divide-immo-border-default overflow-y-auto">
            {visits.isLoading ? (
              <SectionSkeleton rows={3} />
            ) : (visits.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-immo-text-muted">{t('agent_dashboard.no_visits')}</div>
            ) : (
              (visits.data ?? []).map(v => {
                const dt = new Date(v.scheduled_at)
                const dayLabel = isToday(dt) ? "Aujourd'hui" : isTomorrow(dt) ? 'Demain' : format(dt, 'EEEE d MMM', { locale: fr })
                return (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-immo-accent-green/10">
                      <span className="text-xs font-bold text-immo-accent-green">{format(dt, 'HH:mm')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-immo-text-primary">{v.clients?.full_name ?? '-'}</p>
                      <p className="text-[11px] text-immo-text-muted">{dayLabel}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card shadow-sm">
          <div className="border-b border-immo-border-default px-5 py-4">
            <h3 className="text-sm font-semibold text-immo-text-primary">{t('agent_dashboard.clients_relaunch')}</h3>
          </div>
          <div className="max-h-[300px] divide-y divide-immo-border-default overflow-y-auto">
            {relaunch.isLoading ? (
              <SectionSkeleton rows={3} />
            ) : (relaunch.data ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-immo-text-muted">{t('agent_dashboard.all_caught_up')}</div>
            ) : (
              (relaunch.data ?? []).map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <Clock className="h-4 w-4 shrink-0 text-immo-status-orange" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-immo-text-primary">{c.full_name}</p>
                    <p className="text-[11px] text-immo-text-muted">
                      {c.last_contact_at ? t('agent_dashboard.last_contact_on', { date: format(new Date(c.last_contact_at), 'dd/MM') }) : t('agent_dashboard.never_contacted')}
                    </p>
                  </div>
                  {c.confirmed_budget && (
                    <span className="text-xs font-medium text-immo-accent-green">{formatPriceCompact(c.confirmed_budget)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-immo-bg-card-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-immo-bg-card-hover" />
            <div className="h-2 w-1/3 animate-pulse rounded bg-immo-bg-card-hover" />
          </div>
        </div>
      ))}
    </>
  )
}
