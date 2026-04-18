import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, TrendingUp, Scale, Shuffle, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/common'
import type { AssignmentMode } from '@/hooks/useReceptionAssignment'

// Stable palette for stacked bars — cycles for deep agent lists
const AGENT_COLORS = [
  '#00D4A0', '#3782FF', '#FF9A1E', '#A855F7', '#06B6D4',
  '#EAB308', '#F97316', '#EC4899', '#84CC16', '#6366F1',
]

type Range = '7d' | '30d' | '90d'

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 }
const RANGE_LABELS: Record<Range, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
}

interface AssignmentEvent {
  client_id: string
  agent_id: string | null
  created_at: string
  metadata: {
    reassigned_by?: string | null
    from_agent_id?: string | null
    to_agent_id?: string | null
    suggested_agent_id?: string | null
    mode?: AssignmentMode
    reason?: string | null
  } | null
}

interface AgentSummary {
  id: string
  name: string
  assigned: number
  suggested: number
  overrides_for: number
  overrides_against: number
  sales_closed: number
  conversion: number
}

interface ReceptionSummary {
  id: string
  name: string
  assignments: number
  overrides: number
  override_ratio: number
  favorite_agent_id: string | null
  favorite_agent_share: number
}

/**
 * Admin-only view. Reads the `history` table (type = 'reassignment') and
 * derives three angles:
 *   1. Fairness across agents (who gets more leads than the mean + std-dev)
 *   2. Fairness across receptionists (who overrides the suggestion often,
 *      and does their overrides concentrate on one agent → favoritism)
 *   3. Conversion context (leads → sales closed per agent to weigh equity vs. perf)
 */
export function EquityDashboard() {
  const [range, setRange] = useState<Range>('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['reception-equity', range],
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), RANGE_DAYS[range])).toISOString()

      const [eventsRes, usersRes, salesRes] = await Promise.all([
        supabase
          .from('history')
          .select('client_id, agent_id, created_at, metadata')
          .eq('type', 'reassignment')
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .in('role', ['agent', 'reception']),
        supabase
          .from('sales')
          .select('client_id, agent_id, created_at')
          .gte('created_at', since),
      ])

      if (eventsRes.error) throw eventsRes.error
      if (usersRes.error) throw usersRes.error
      if (salesRes.error) throw salesRes.error

      return {
        events: (eventsRes.data ?? []) as AssignmentEvent[],
        users: (usersRes.data ?? []) as Array<{
          id: string
          first_name: string
          last_name: string
          role: 'agent' | 'reception'
        }>,
        sales: (salesRes.data ?? []) as Array<{ client_id: string; agent_id: string; created_at: string }>,
      }
    },
  })

  const summary = useMemo(() => {
    if (!data) return null

    const userById = new Map(data.users.map(u => [u.id, u]))
    const agents = data.users.filter(u => u.role === 'agent')
    const receptions = data.users.filter(u => u.role === 'reception')

    const agentMap = new Map<string, AgentSummary>()
    agents.forEach(a =>
      agentMap.set(a.id, {
        id: a.id,
        name: `${a.first_name} ${a.last_name}`,
        assigned: 0,
        suggested: 0,
        overrides_for: 0,
        overrides_against: 0,
        sales_closed: 0,
        conversion: 0,
      }),
    )

    const recepMap = new Map<
      string,
      ReceptionSummary & { _targets: Map<string, number> }
    >()
    receptions.forEach(r =>
      recepMap.set(r.id, {
        id: r.id,
        name: `${r.first_name} ${r.last_name}`,
        assignments: 0,
        overrides: 0,
        override_ratio: 0,
        favorite_agent_id: null,
        favorite_agent_share: 0,
        _targets: new Map(),
      }),
    )

    for (const ev of data.events) {
      const m = ev.metadata ?? {}
      const toAgent = m.to_agent_id ?? ev.agent_id
      const suggested = m.suggested_agent_id ?? null
      const reassignedBy = m.reassigned_by ?? null
      const isOverride =
        suggested !== null && toAgent !== null && toAgent !== suggested && m.mode !== 'manual'

      if (toAgent) {
        const a = agentMap.get(toAgent)
        if (a) {
          a.assigned += 1
          if (suggested === toAgent) a.suggested += 1
          if (isOverride) a.overrides_for += 1
        }
      }
      if (isOverride && suggested) {
        const a = agentMap.get(suggested)
        if (a) a.overrides_against += 1
      }

      if (reassignedBy && recepMap.has(reassignedBy)) {
        const r = recepMap.get(reassignedBy)!
        r.assignments += 1
        if (isOverride) r.overrides += 1
        if (toAgent) {
          r._targets.set(toAgent, (r._targets.get(toAgent) ?? 0) + 1)
        }
      }
    }

    for (const a of agentMap.values()) {
      const closed = data.sales.filter(s => s.agent_id === a.id).length
      a.sales_closed = closed
      a.conversion = a.assigned > 0 ? Math.round((closed / a.assigned) * 100) : 0
    }

    const agentArr = [...agentMap.values()].sort((x, y) => y.assigned - x.assigned)
    const total = agentArr.reduce((s, a) => s + a.assigned, 0)
    const mean = agentArr.length > 0 ? total / agentArr.length : 0
    const variance =
      agentArr.length > 0
        ? agentArr.reduce((s, a) => s + (a.assigned - mean) ** 2, 0) / agentArr.length
        : 0
    const stddev = Math.sqrt(variance)

    const receptionArr = [...recepMap.values()].map(r => {
      let favId: string | null = null
      let favCount = 0
      for (const [id, count] of r._targets.entries()) {
        if (count > favCount) {
          favCount = count
          favId = id
        }
      }
      return {
        id: r.id,
        name: r.name,
        assignments: r.assignments,
        overrides: r.overrides,
        override_ratio: r.assignments > 0 ? Math.round((r.overrides / r.assignments) * 100) : 0,
        favorite_agent_id: favId,
        favorite_agent_share:
          r.assignments > 0 ? Math.round((favCount / r.assignments) * 100) : 0,
      }
    })

    // Daily flow: one row per day, one numeric key per agent. Used to
    // feed a stacked bar chart that shows who gets leads when.
    const days = eachDayOfInterval({
      start: subDays(new Date(), RANGE_DAYS[range] - 1),
      end: new Date(),
    })
    const flow: Array<Record<string, number | string>> = days.map(d => ({
      day: format(d, 'dd/MM'),
      _total: 0,
    }))
    const dayIndex = new Map(flow.map((row, i) => [row.day as string, i]))
    for (const a of agentArr) {
      for (const row of flow) row[a.name] = 0
    }
    for (const ev of data.events) {
      const m = ev.metadata ?? {}
      const toAgent = m.to_agent_id ?? ev.agent_id
      if (!toAgent) continue
      const a = agentMap.get(toAgent)
      if (!a) continue
      const day = format(new Date(ev.created_at), 'dd/MM')
      const idx = dayIndex.get(day)
      if (idx === undefined) continue
      flow[idx][a.name] = ((flow[idx][a.name] as number) ?? 0) + 1
      flow[idx]._total = ((flow[idx]._total as number) ?? 0) + 1
    }

    return {
      agents: agentArr,
      receptions: receptionArr,
      total,
      mean,
      stddev,
      userById,
      flow,
    }
  }, [data, range])

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />
  if (!summary) return null

  const outliers = summary.agents.filter(a =>
    summary.stddev > 0 ? Math.abs(a.assigned - summary.mean) > summary.stddev * 1.5 : false,
  )
  const favoritism = summary.receptions.filter(
    r => r.assignments >= 5 && r.favorite_agent_share >= 60,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-immo-text-muted">
          Tableau de bord réservé à l'admin. Détecte un déséquilibre dans la distribution des leads et un éventuel favoritisme d'un·e réceptionniste.
        </p>
        <div className="flex gap-1 rounded-lg border border-immo-border-default bg-immo-bg-card p-0.5">
          {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                range === r
                  ? 'bg-immo-accent-green/10 text-immo-accent-green'
                  : 'text-immo-text-muted hover:text-immo-text-primary'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* High-level numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={TrendingUp} label="Leads attribués" value={summary.total} />
        <StatTile icon={Users} label="Agents concernés" value={summary.agents.length} />
        <StatTile
          icon={Scale}
          label="Moyenne / agent"
          value={summary.mean.toFixed(1)}
          hint={`σ ${summary.stddev.toFixed(1)}`}
        />
        <StatTile
          icon={Shuffle}
          label="Overrides détectés"
          value={summary.receptions.reduce((s, r) => s + r.overrides, 0)}
          hint="hors mode manuel"
        />
      </div>

      {/* Flux: leads par jour, empilé par agent */}
      {summary.agents.length > 0 && summary.flow.length > 0 && (
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-immo-text-primary">
              Flux réception → agent ({RANGE_LABELS[range].toLowerCase()})
            </h3>
            <span className="text-[11px] text-immo-text-muted">
              {summary.total} lead(s) attribué(s)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary.flow} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#8A8D93', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#ffffff20' }}
              />
              <YAxis
                tick={{ fill: '#8A8D93', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#ffffff20' }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#ffffff08' }}
                contentStyle={{
                  backgroundColor: '#1a1d21',
                  border: '1px solid #ffffff20',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {summary.agents.map((a, i) => (
                <Bar
                  key={a.id}
                  dataKey={a.name}
                  stackId="leads"
                  fill={AGENT_COLORS[i % AGENT_COLORS.length]}
                  radius={i === summary.agents.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Warnings */}
      {(outliers.length > 0 || favoritism.length > 0) && (
        <div className="space-y-2">
          {outliers.length > 0 && (
            <WarningBanner>
              <strong>Déséquilibre:</strong> {outliers.length} agent(s) reçoivent significativement plus/moins que la moyenne —{' '}
              {outliers.map(o => `${o.name} (${o.assigned})`).join(', ')}.
            </WarningBanner>
          )}
          {favoritism.length > 0 && (
            <WarningBanner>
              <strong>Favoritisme potentiel:</strong>{' '}
              {favoritism
                .map(r => {
                  const fav = r.favorite_agent_id ? summary.userById.get(r.favorite_agent_id) : null
                  const favName = fav ? `${fav.first_name} ${fav.last_name}` : '—'
                  return `${r.name} envoie ${r.favorite_agent_share}% de ses leads à ${favName}`
                })
                .join(' · ')}
              .
            </WarningBanner>
          )}
        </div>
      )}

      {/* Distribution par agent */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-immo-text-primary">
          Distribution par agent ({RANGE_LABELS[range].toLowerCase()})
        </h3>
        {summary.agents.length === 0 ? (
          <p className="text-xs text-immo-text-muted">Aucune attribution sur cette période.</p>
        ) : (
          <div className="space-y-2">
            {summary.agents.map(a => {
              const max = summary.agents[0]?.assigned || 1
              const pct = (a.assigned / max) * 100
              const isOutlier = outliers.some(o => o.id === a.id)
              return (
                <div key={a.id} className="text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-immo-text-primary">
                      {a.name}
                      {isOutlier && (
                        <span className="ml-1.5 rounded-full bg-immo-status-orange/10 px-1.5 py-0.5 text-[9px] font-bold text-immo-status-orange">
                          HORS MOYENNE
                        </span>
                      )}
                    </span>
                    <span className="text-immo-text-muted">
                      {a.assigned} leads · {a.sales_closed} ventes · {a.conversion}%
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-immo-bg-primary">
                    <div
                      className="bg-immo-accent-green"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {(a.overrides_for > 0 || a.overrides_against > 0) && (
                    <div className="mt-0.5 text-[10px] text-immo-text-muted">
                      reçu via override: {a.overrides_for} · écarté par override: {a.overrides_against}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Détail par réceptionniste */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-immo-text-primary">
          Comportement des réceptionnistes
        </h3>
        {summary.receptions.length === 0 ? (
          <p className="text-xs text-immo-text-muted">
            Aucune attribution loggée par un·e réceptionniste sur cette période.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-immo-border-default text-left text-[10px] uppercase tracking-wide text-immo-text-muted">
                  <th className="py-2 font-medium">Réceptionniste</th>
                  <th className="py-2 font-medium">Attribs</th>
                  <th className="py-2 font-medium">Overrides</th>
                  <th className="py-2 font-medium">% override</th>
                  <th className="py-2 font-medium">Agent favori</th>
                </tr>
              </thead>
              <tbody>
                {summary.receptions.map(r => {
                  const fav = r.favorite_agent_id
                    ? summary.userById.get(r.favorite_agent_id)
                    : null
                  const isFlagged = favoritism.some(f => f.id === r.id)
                  return (
                    <tr key={r.id} className="border-b border-immo-border-default/50">
                      <td className="py-2 font-medium text-immo-text-primary">{r.name}</td>
                      <td className="py-2 text-immo-text-muted">{r.assignments}</td>
                      <td className="py-2 text-immo-text-muted">{r.overrides}</td>
                      <td className="py-2">
                        <span
                          className={
                            r.override_ratio > 40
                              ? 'text-immo-status-orange'
                              : 'text-immo-text-muted'
                          }
                        >
                          {r.override_ratio}%
                        </span>
                      </td>
                      <td className="py-2">
                        {fav ? (
                          <span
                            className={
                              isFlagged
                                ? 'font-semibold text-immo-status-orange'
                                : 'text-immo-text-muted'
                            }
                          >
                            {fav.first_name} {fav.last_name} ({r.favorite_agent_share}%)
                          </span>
                        ) : (
                          <span className="text-immo-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-immo-text-muted">
        Dernière mise à jour {format(new Date(), 'd MMM HH:mm', { locale: fr })}. Les seuils appliqués: écart supérieur à 1.5σ (déséquilibre), ≥ 60% de leads vers un même agent (favoritisme, sur au moins 5 attributions).
      </p>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-immo-text-muted">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-immo-text-primary">{value}</div>
      {hint && <div className="text-[10px] text-immo-text-muted">{hint}</div>}
    </div>
  )
}

function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-immo-status-orange/40 bg-immo-status-orange/5 px-3 py-2 text-[11px] text-immo-text-primary">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-immo-status-orange" />
      <div>{children}</div>
    </div>
  )
}
