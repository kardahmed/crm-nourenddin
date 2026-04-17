import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserPlus, CalendarCheck, Users, Inbox, Scale } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { KPICard, LoadingSpinner } from '@/components/common'
import { NewContactForm } from './components/NewContactForm'
import { TodayVisitsList } from './components/TodayVisitsList'
import { UnassignedQueue } from './components/UnassignedQueue'
import { AgentsDirectory } from './components/AgentsDirectory'
import { EquityDashboard } from './components/EquityDashboard'
import { useReceptionSettings, MODE_LABELS } from '@/hooks/useReceptionAssignment'
import { usePermissions } from '@/hooks/usePermissions'

type TabKey = 'new' | 'visits' | 'unassigned' | 'directory' | 'equity'

export function ReceptionPage() {
  const [tab, setTab] = useState<TabKey>('new')
  const { data: settings } = useReceptionSettings()
  const { isAdmin } = usePermissions()

  // Header metrics — kept lightweight so the hub loads fast.
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['reception-metrics'],
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const [visitsRes, todayLeadsRes, unassignedRes, agentsRes] = await Promise.all([
        supabase.from('visits')
          .select('id, status', { count: 'exact', head: false })
          .gte('scheduled_at', todayStart.toISOString())
          .lte('scheduled_at', todayEnd.toISOString()),
        supabase.from('clients')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString()),
        supabase.from('clients')
          .select('id', { count: 'exact', head: true })
          .is('agent_id', null),
        supabase.from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'agent')
          .eq('status', 'active'),
      ])

      return {
        visitsToday: visitsRes.count ?? 0,
        visitsCompleted: (visitsRes.data ?? []).filter(v => v.status === 'completed').length,
        leadsToday: todayLeadsRes.count ?? 0,
        unassigned: unassignedRes.count ?? 0,
        activeAgents: agentsRes.count ?? 0,
      }
    },
    staleTime: 30_000,
  })

  const TABS = useMemo(() => {
    const base = [
      { key: 'new' as TabKey, label: 'Nouveau contact', icon: UserPlus },
      { key: 'visits' as TabKey, label: 'Visites du jour', icon: CalendarCheck, count: metrics?.visitsToday },
      { key: 'unassigned' as TabKey, label: 'Non-assignés', icon: Inbox, count: metrics?.unassigned },
      { key: 'directory' as TabKey, label: 'Agents', icon: Users, count: metrics?.activeAgents },
    ]
    if (isAdmin) {
      base.push({ key: 'equity' as TabKey, label: 'Équité', icon: Scale })
    }
    return base
  }, [metrics, isAdmin])

  if (isLoading) return <LoadingSpinner size="lg" className="h-96" />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-immo-text-primary">Réception</h1>
          <p className="text-sm text-immo-text-muted">
            Accueil des clients, saisie des nouveaux leads, répartition vers les agents.
          </p>
        </div>
        {settings && (
          <div className="rounded-lg border border-immo-border-default bg-immo-bg-card px-3 py-2 text-[11px]">
            <span className="text-immo-text-muted">Mode d'attribution:</span>{' '}
            <span className="font-semibold text-immo-accent-green">
              {MODE_LABELS[settings.mode]}
            </span>
            <span className="ml-2 text-immo-text-muted">
              (plafond {settings.maxLeadsPerDay}/jour par agent)
            </span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          label="Leads aujourd'hui"
          value={metrics?.leadsToday ?? 0}
          accent="green"
          icon={<UserPlus className="h-4 w-4 text-immo-accent-green" />}
        />
        <KPICard
          label="Visites prévues"
          value={metrics?.visitsToday ?? 0}
          accent="blue"
          icon={<CalendarCheck className="h-4 w-4 text-immo-accent-blue" />}
        />
        <KPICard
          label="Non-assignés"
          value={metrics?.unassigned ?? 0}
          accent={metrics && metrics.unassigned > 0 ? 'orange' : 'green'}
          icon={<Inbox className="h-4 w-4 text-immo-status-orange" />}
        />
        <KPICard
          label="Agents actifs"
          value={metrics?.activeAgents ?? 0}
          accent="blue"
          icon={<Users className="h-4 w-4 text-immo-accent-blue" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-immo-border-default">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'border-immo-accent-green text-immo-accent-green'
                : 'border-transparent text-immo-text-muted hover:text-immo-text-primary'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                t.key === 'unassigned'
                  ? 'bg-immo-status-orange/10 text-immo-status-orange'
                  : 'bg-immo-accent-green/10 text-immo-accent-green'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'new' && <NewContactForm />}
      {tab === 'visits' && <TodayVisitsList />}
      {tab === 'unassigned' && <UnassignedQueue />}
      {tab === 'directory' && <AgentsDirectory />}
      {tab === 'equity' && isAdmin && <EquityDashboard />}
    </div>
  )
}
