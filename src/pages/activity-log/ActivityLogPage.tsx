import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr as frLocale, ar as arLocale, enUS as enLocale } from 'date-fns/locale'
import {
  Activity, Download, Filter, Search, ChevronDown, ChevronRight,
  Database, MessageSquare, Mail, Clock, User, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { KPICard, LoadingSpinner, EmptyState } from '@/components/common'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useActivityLog, type ActivityEntry, type ActivitySource } from '@/hooks/useActivityLog'

const SOURCE_META: Record<ActivitySource, { icon: typeof Activity; color: string; bg: string; label: string }> = {
  audit: { icon: Database, color: 'text-immo-accent-blue', bg: 'bg-immo-accent-blue/10', label: 'audit' },
  history: { icon: Activity, color: 'text-immo-accent-green', bg: 'bg-immo-accent-green/10', label: 'history' },
  email: { icon: Mail, color: 'text-immo-status-orange', bg: 'bg-immo-status-orange/10', label: 'email' },
  message: { icon: MessageSquare, color: 'text-immo-status-red', bg: 'bg-immo-status-red/10', label: 'message' },
}

function toCsv(rows: ActivityEntry[]): string {
  const header = ['timestamp', 'source', 'actor', 'action', 'title', 'description', 'table', 'record_id', 'client']
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      r.created_at,
      r.source,
      r.actor_name ?? '',
      r.action,
      r.title,
      r.description ?? '',
      r.table_name ?? '',
      r.record_id ?? '',
      r.client_name ?? '',
    ].map(escape).join(','))
  }
  return lines.join('\n')
}

export function ActivityLogPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? arLocale : i18n.language === 'en' ? enLocale : frLocale

  const [agentId, setAgentId] = useState<string>('')
  const [source, setSource] = useState<ActivitySource | 'all'>('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setToDate] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Agents list for the "Agent" filter dropdown
  const { data: agents = [] } = useQuery({
    queryKey: ['activity-log-agents'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('id, first_name, last_name').order('first_name')
      return (data ?? []) as Array<{ id: string; first_name: string; last_name: string }>
    },
  })

  const filters = useMemo(
    () => ({
      agentId: agentId || undefined,
      source,
      search: search || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(new Date(to).setHours(23, 59, 59, 999)).toISOString() : undefined,
    }),
    [agentId, source, search, from, to],
  )

  const { data: entries = [], isLoading } = useActivityLog(filters)

  // Stats
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()
    const byAgent = new Map<string, number>()
    let todayCount = 0
    const bySource: Record<ActivitySource, number> = { audit: 0, history: 0, email: 0, message: 0 }

    for (const e of entries) {
      if (new Date(e.created_at).getTime() >= todayMs) todayCount++
      bySource[e.source]++
      if (e.actor_name) byAgent.set(e.actor_name, (byAgent.get(e.actor_name) ?? 0) + 1)
    }
    const topAgent = [...byAgent.entries()].sort((a, b) => b[1] - a[1])[0]
    return { total: entries.length, today: todayCount, bySource, topAgent }
  }, [entries])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exportCsv() {
    const csv = toCsv(entries)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetFilters() {
    setAgentId('')
    setSource('all')
    setSearch('')
    setFrom('')
    setToDate('')
  }

  const hasActiveFilters = agentId || source !== 'all' || search || from || to

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-immo-text-primary">{t('activity_log.title')}</h1>
          <p className="mt-1 text-sm text-immo-text-muted">{t('activity_log.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {t('activity_log.filters')}
            {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-immo-accent-green" />}
          </Button>
          <Button onClick={exportCsv} disabled={entries.length === 0} className="gap-2 bg-immo-accent-green text-immo-bg-primary hover:bg-immo-accent-green/90">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label={t('activity_log.kpi_total')}
          value={stats.total}
          accent="green"
          icon={<Activity className="h-5 w-5 text-immo-accent-green" />}
        />
        <KPICard
          label={t('activity_log.kpi_today')}
          value={stats.today}
          accent="blue"
          icon={<Clock className="h-5 w-5 text-immo-accent-blue" />}
        />
        <KPICard
          label={t('activity_log.kpi_top_agent')}
          value={stats.topAgent ? stats.topAgent[0] : '-'}
          subtitle={stats.topAgent ? `${stats.topAgent[1]} ${t('activity_log.events')}` : undefined}
          accent="orange"
          icon={<User className="h-5 w-5 text-immo-status-orange" />}
        />
        <KPICard
          label={t('activity_log.kpi_sources')}
          value={`${stats.bySource.audit}/${stats.bySource.history}/${stats.bySource.email}/${stats.bySource.message}`}
          subtitle={t('activity_log.sources_legend')}
          accent="red"
          icon={<Database className="h-5 w-5 text-immo-status-red" />}
        />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-immo-text-muted">{t('activity_log.filter_agent')}</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="h-9 w-full rounded-lg border border-immo-border-default bg-immo-bg-primary px-3 text-xs text-immo-text-primary"
              >
                <option value="">{t('activity_log.all_agents')}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-immo-text-muted">{t('activity_log.filter_source')}</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ActivitySource | 'all')}
                className="h-9 w-full rounded-lg border border-immo-border-default bg-immo-bg-primary px-3 text-xs text-immo-text-primary"
              >
                <option value="all">{t('activity_log.all_sources')}</option>
                <option value="audit">{t('activity_log.source_audit')}</option>
                <option value="history">{t('activity_log.source_history')}</option>
                <option value="email">{t('activity_log.source_email')}</option>
                <option value="message">{t('activity_log.source_message')}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-immo-text-muted">{t('activity_log.filter_from')}</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-full rounded-lg border border-immo-border-default bg-immo-bg-primary px-3 text-xs text-immo-text-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-immo-text-muted">{t('activity_log.filter_to')}</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-immo-border-default bg-immo-bg-primary px-3 text-xs text-immo-text-primary"
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="h-9 w-full gap-2">
                <X className="h-3.5 w-3.5" />
                {t('activity_log.reset')}
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-medium text-immo-text-muted">{t('activity_log.search')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-immo-text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('activity_log.search_placeholder')}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <LoadingSpinner size="lg" className="h-96" />
      ) : entries.length === 0 ? (
        <EmptyState icon={<Activity className="h-12 w-12" />} title={t('activity_log.empty_title')} description={t('activity_log.empty_desc')} />
      ) : (
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card">
          <div className="divide-y divide-immo-border-default">
            {entries.map((e) => {
              const meta = SOURCE_META[e.source]
              const Icon = meta.icon
              const isExpanded = expanded.has(e.id)
              const hasDetail = e.old_data || e.new_data || (e.metadata && Object.keys(e.metadata).length > 0)

              return (
                <div key={e.id} className="group">
                  <button
                    onClick={() => hasDetail && toggleExpand(e.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${hasDetail ? 'hover:bg-immo-bg-card-hover' : ''}`}
                    disabled={!hasDetail}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-immo-text-primary">{e.title}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                          {t(`activity_log.source_${e.source}`)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-immo-text-muted">
                        {e.actor_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {e.actor_name}
                          </span>
                        )}
                        {e.client_name && (
                          <span>
                            → {e.client_name}
                          </span>
                        )}
                        <span>{format(new Date(e.created_at), 'dd MMM yyyy, HH:mm:ss', { locale })}</span>
                        {e.description && <span className="truncate max-w-md">{e.description}</span>}
                      </div>
                    </div>

                    {hasDetail && (
                      isExpanded
                        ? <ChevronDown className="h-4 w-4 shrink-0 text-immo-text-muted" />
                        : <ChevronRight className="h-4 w-4 shrink-0 text-immo-text-muted" />
                    )}
                  </button>

                  {isExpanded && hasDetail && (
                    <div className="border-t border-immo-border-default bg-immo-bg-primary px-4 py-3 text-xs">
                      {e.old_data && (
                        <div className="mb-3">
                          <div className="mb-1 font-semibold text-immo-status-red">{t('activity_log.old_data')}</div>
                          <pre className="overflow-x-auto rounded border border-immo-border-default bg-immo-bg-card p-2 font-mono text-[11px] text-immo-text-secondary">
                            {JSON.stringify(e.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {e.new_data && (
                        <div className="mb-3">
                          <div className="mb-1 font-semibold text-immo-accent-green">{t('activity_log.new_data')}</div>
                          <pre className="overflow-x-auto rounded border border-immo-border-default bg-immo-bg-card p-2 font-mono text-[11px] text-immo-text-secondary">
                            {JSON.stringify(e.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div>
                          <div className="mb-1 font-semibold text-immo-accent-blue">{t('activity_log.metadata')}</div>
                          <pre className="overflow-x-auto rounded border border-immo-border-default bg-immo-bg-card p-2 font-mono text-[11px] text-immo-text-secondary">
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
