import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  UserPlus, UserCheck, CheckCircle2, ArrowRightLeft, FileText,
  Download,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner, EmptyState } from '@/components/common'

type Range = '1d' | '7d' | '30d' | '90d'
const RANGE_DAYS: Record<Range, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 }
const RANGE_LABELS: Record<Range, string> = {
  '1d': 'Aujourd\'hui',
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
}

type EventKind = 'client_created' | 'reassignment' | 'visit_confirmed'
type FilterKind = 'all' | EventKind

const KIND_LABELS: Record<EventKind, string> = {
  client_created: 'Lead créé',
  reassignment: 'Assignation',
  visit_confirmed: 'Check-in visite',
}

const KIND_COLORS: Record<EventKind, string> = {
  client_created: '#00D4A0',
  reassignment: '#3782FF',
  visit_confirmed: '#A855F7',
}

const KIND_ICONS: Record<EventKind, typeof UserPlus> = {
  client_created: UserPlus,
  reassignment: ArrowRightLeft,
  visit_confirmed: CheckCircle2,
}

interface JournalRow {
  id: string
  created_at: string
  type: EventKind
  title: string
  description: string | null
  client_id: string
  client_name: string | null
  agent_id: string | null
  agent_name: string | null
  actor_name: string | null   // receptionist/admin who triggered it
  override_reason: string | null
}

/**
 * Admin-only log of every reception-side event: leads created, visits
 * confirmed, assignments (auto or manual override). One row per event,
 * sorted by time descending. Filters by date range and event type.
 */
export function ReceptionJournal() {
  const [range, setRange] = useState<Range>('7d')
  const [kind, setKind] = useState<FilterKind>('all')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['reception-journal', range, kind],
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), RANGE_DAYS[range])).toISOString()
      const types: EventKind[] =
        kind === 'all' ? ['client_created', 'reassignment', 'visit_confirmed'] : [kind]

      const { data, error } = await supabase
        .from('history')
        .select(`
          id, created_at, type, title, description, metadata,
          client_id, agent_id,
          clients(full_name),
          users!history_agent_id_fkey(first_name, last_name)
        `)
        .in('type', types)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      const raw = (data ?? []) as Array<Record<string, unknown>>

      // Collect actor IDs for a single user lookup
      const actorIds = new Set<string>()
      for (const r of raw) {
        const md = (r.metadata as Record<string, unknown> | null) ?? {}
        const actorId = (md.reassigned_by as string | null)
          ?? (md.created_by as string | null)
          ?? null
        if (actorId) actorIds.add(actorId)
      }

      const actorMap = new Map<string, string>()
      if (actorIds.size > 0) {
        const { data: actors } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', Array.from(actorIds))
        for (const a of (actors ?? []) as Array<{ id: string; first_name: string; last_name: string }>) {
          actorMap.set(a.id, `${a.first_name} ${a.last_name}`)
        }
      }

      return raw.map((r): JournalRow => {
        const md = (r.metadata as Record<string, unknown> | null) ?? {}
        const actorId = (md.reassigned_by as string | null)
          ?? (md.created_by as string | null)
          ?? null
        const client = r.clients as { full_name: string } | null
        const agent = r.users as { first_name: string; last_name: string } | null
        return {
          id: r.id as string,
          created_at: r.created_at as string,
          type: r.type as EventKind,
          title: r.title as string,
          description: (r.description as string | null) ?? null,
          client_id: r.client_id as string,
          client_name: client?.full_name ?? null,
          agent_id: (r.agent_id as string | null) ?? null,
          agent_name: agent ? `${agent.first_name} ${agent.last_name}` : null,
          actor_name: actorId ? actorMap.get(actorId) ?? null : null,
          override_reason: (md.reason as string | null) ?? null,
        }
      })
    },
    staleTime: 30_000,
  })

  const kpi = useMemo(() => {
    const total = rows.length
    const created = rows.filter(r => r.type === 'client_created').length
    const reassigned = rows.filter(r => r.type === 'reassignment').length
    const checkins = rows.filter(r => r.type === 'visit_confirmed').length
    const overrides = rows.filter(r => r.override_reason && r.override_reason.trim()).length
    return { total, created, reassigned, checkins, overrides }
  }, [rows])

  function downloadCsv() {
    const header = ['Horodatage', 'Événement', 'Client', 'Agent', 'Auteur', 'Motif']
    const lines = rows.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      KIND_LABELS[r.type],
      r.client_name ?? '',
      r.agent_name ?? '',
      r.actor_name ?? '',
      r.override_reason ?? '',
    ])
    const csv = [header, ...lines]
      .map(cells => cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-reception-${range}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-immo-border-default bg-immo-bg-card p-0.5">
          {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                range === r
                  ? 'bg-immo-accent-green/10 text-immo-accent-green'
                  : 'text-immo-text-muted hover:text-immo-text-primary'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-lg border border-immo-border-default bg-immo-bg-card p-0.5">
          <button
            onClick={() => setKind('all')}
            className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
              kind === 'all'
                ? 'bg-immo-accent-green/10 text-immo-accent-green'
                : 'text-immo-text-muted hover:text-immo-text-primary'
            }`}
          >
            Tout
          </button>
          {(Object.keys(KIND_LABELS) as EventKind[]).map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                kind === k
                  ? 'bg-immo-accent-green/10 text-immo-accent-green'
                  : 'text-immo-text-muted hover:text-immo-text-primary'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <button
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="ml-auto flex h-7 items-center gap-1.5 rounded-md border border-immo-border-default px-3 text-[11px] font-medium text-immo-text-muted hover:text-immo-text-primary disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <MiniKpi label="Événements" value={kpi.total} />
        <MiniKpi label="Leads créés" value={kpi.created} color={KIND_COLORS.client_created} />
        <MiniKpi label="Assignations" value={kpi.reassigned} color={KIND_COLORS.reassignment} />
        <MiniKpi label="Check-ins" value={kpi.checkins} color={KIND_COLORS.visit_confirmed} />
        <MiniKpi label="Overrides" value={kpi.overrides} color="#FF9A1E" />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner size="md" className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Aucun événement"
          description={`Rien n'a été enregistré sur la période "${RANGE_LABELS[range]}".`}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-immo-border-default bg-immo-bg-card">
          <div className="max-h-[540px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-immo-bg-card-hover">
                <tr className="text-left text-[10px] uppercase tracking-wider text-immo-text-muted">
                  <th className="px-3 py-2 font-semibold">Quand</th>
                  <th className="px-3 py-2 font-semibold">Événement</th>
                  <th className="px-3 py-2 font-semibold">Client</th>
                  <th className="px-3 py-2 font-semibold">Agent assigné</th>
                  <th className="px-3 py-2 font-semibold">Auteur</th>
                  <th className="px-3 py-2 font-semibold">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-immo-border-default">
                {rows.map(r => {
                  const Icon = KIND_ICONS[r.type]
                  const color = KIND_COLORS[r.type]
                  return (
                    <tr key={r.id} className="hover:bg-immo-bg-card-hover">
                      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-immo-text-muted">
                        <div>{format(new Date(r.created_at), 'dd MMM', { locale: fr })}</div>
                        <div className="text-[10px]">{format(new Date(r.created_at), 'HH:mm')}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          <Icon className="h-3 w-3" /> {KIND_LABELS[r.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-immo-text-primary">
                        {r.client_name ?? <span className="text-immo-text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2 text-immo-text-primary">
                        {r.agent_name ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <UserCheck className="h-3 w-3 text-immo-text-muted" />
                            {r.agent_name}
                          </div>
                        ) : (
                          <span className="text-immo-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-immo-text-secondary">
                        {r.actor_name ?? <span className="text-immo-text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2 text-immo-text-muted">
                        <div className="line-clamp-1">{r.title}</div>
                        {r.override_reason && (
                          <div className="mt-0.5 rounded bg-immo-status-orange/10 px-1.5 py-0.5 text-[10px] font-medium text-immo-status-orange">
                            Motif override: {r.override_reason}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniKpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-immo-border-default bg-immo-bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-immo-text-muted">
        {label}
      </div>
      <div
        className="mt-0.5 text-lg font-bold"
        style={color ? { color } : { color: 'var(--immo-text-primary)' }}
      >
        {value}
      </div>
    </div>
  )
}
