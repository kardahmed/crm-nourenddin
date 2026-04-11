import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { KPICard, LoadingSpinner, StatusBadge } from '@/components/common'
import { format } from 'date-fns'

export function MonitoringPage() {
  // Fetch edge function logs via super_admin_logs + recent errors
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-monitoring'],
    queryFn: async () => {
      const [logsRes, errorsRes, functionsRes] = await Promise.all([
        supabase.from('super_admin_logs').select('action, created_at, details').order('created_at', { ascending: false }).limit(50),
        supabase.from('super_admin_logs').select('id', { count: 'exact', head: true }).eq('action', 'error'),
        supabase.from('super_admin_logs').select('action').order('created_at', { ascending: false }).limit(200),
      ])

      // Count actions by type
      const actionCounts = new Map<string, number>()
      for (const log of (functionsRes.data ?? []) as Array<{ action: string }>) {
        actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1)
      }

      const functionStats = Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return {
        recentLogs: (logsRes.data ?? []) as Array<{ action: string; created_at: string; details: Record<string, unknown> | null }>,
        errorCount: errorsRes.count ?? 0,
        totalLogs: (functionsRes.data ?? []).length,
        functionStats,
      }
    },
    refetchInterval: 60_000,
  })

  if (isLoading || !data) return <LoadingSpinner size="lg" className="h-96" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-immo-text-primary">Monitoring</h1>

      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Actions (24h)" value={data.totalLogs} accent="blue" icon={<Activity className="h-5 w-5 text-immo-accent-blue" />} />
        <KPICard label="Erreurs" value={data.errorCount} accent={data.errorCount > 0 ? 'red' : 'green'} icon={<AlertTriangle className="h-5 w-5 text-immo-status-red" />} />
        <KPICard label="Edge Functions" value={data.functionStats.length || 'N/A'} accent="green" icon={<Zap className="h-5 w-5 text-immo-accent-green" />} />
        <KPICard label="Statut" value={data.errorCount > 5 ? 'Alerte' : data.errorCount > 0 ? 'Degradé' : 'OK'} accent={data.errorCount > 5 ? 'red' : data.errorCount > 0 ? 'orange' : 'green'} icon={<CheckCircle className="h-5 w-5 text-immo-accent-green" />} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Action frequency */}
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card">
          <div className="border-b border-immo-border-default px-5 py-4">
            <h3 className="text-sm font-semibold text-immo-text-primary">Actions frequentes</h3>
          </div>
          <div className="divide-y divide-immo-border-default">
            {data.functionStats.map(s => (
              <div key={s.action} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-immo-text-primary">{s.action}</span>
                <StatusBadge label={String(s.count)} type="blue" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card">
          <div className="border-b border-immo-border-default px-5 py-4">
            <h3 className="text-sm font-semibold text-immo-text-primary">Logs recents</h3>
          </div>
          <div className="max-h-[400px] divide-y divide-immo-border-default overflow-y-auto">
            {data.recentLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-immo-text-muted" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-immo-text-primary">{log.action}</span>
                </div>
                <span className="shrink-0 text-[10px] text-immo-text-muted">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
