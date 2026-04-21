import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format, getHours, getMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CheckCircle, Clock, MapPin, Phone, UserCheck, List, LayoutGrid,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { LoadingSpinner } from '@/components/common'
import { VISIT_STATUS_LABELS } from '@/types'
import type { VisitStatus } from '@/types'

interface VisitRow {
  id: string
  scheduled_at: string
  status: VisitStatus
  visit_type: string
  notes: string | null
  client: { id: string; full_name: string; phone: string } | null
  agent: { id: string; first_name: string; last_name: string } | null
  project: { name: string } | null
}

/* ── Day grid constants ── */
const DAY_START_HOUR = 8
const DAY_END_HOUR = 20
const MINUTES_PER_DAY = (DAY_END_HOUR - DAY_START_HOUR) * 60
const PX_PER_MINUTE = 1.2   // 72px per hour → 864px total, scrollable
const DEFAULT_VISIT_MIN = 60

function useTodayVisits() {
  return useQuery({
    queryKey: ['reception-today-visits'],
    queryFn: async () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, scheduled_at, status, visit_type, notes,
          clients(id, full_name, phone),
          users!visits_agent_id_fkey(id, first_name, last_name),
          projects(name)
        `)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true })

      if (error) throw error

      return (data ?? []).map((v: Record<string, unknown>) => ({
        id: v.id as string,
        scheduled_at: v.scheduled_at as string,
        status: v.status as VisitStatus,
        visit_type: v.visit_type as string,
        notes: (v.notes as string | null) ?? null,
        client: v.clients as VisitRow['client'],
        agent: v.users as VisitRow['agent'],
        project: v.projects as VisitRow['project'],
      })) as VisitRow[]
    },
  })
}

function useCheckIn() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: VisitRow) => {
      if (!v.client) throw new Error(t('error.generic'))

      const { error: upErr } = await supabase
        .from('visits')
        .update({ status: 'confirmed' } as never)
        .eq('id', v.id)
      if (upErr) { handleSupabaseError(upErr); throw upErr }

      const { error: hErr } = await supabase.from('history').insert({
        client_id: v.client.id,
        agent_id: v.agent?.id ?? null,
        type: 'visit_confirmed',
        title: `Client arrivé: ${v.client.full_name}`,
        description: `Check-in par la réception à ${format(new Date(), 'HH:mm')}`,
        metadata: {
          visit_id: v.id,
          scheduled_at: v.scheduled_at,
          checkin_at: new Date().toISOString(),
        },
      } as never)
      if (hErr) { handleSupabaseError(hErr); throw hErr }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reception-today-visits'] })
      qc.invalidateQueries({ queryKey: ['reception-metrics'] })
      toast.success(t('reception_form.toast_checked_in'))
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('error.generic'))
    },
  })
}

/* ═════════════════════════════════════════════════════════════
   Panel with view-mode toggle. Same data source, two layouts.
   ═════════════════════════════════════════════════════════════ */
type ViewMode = 'list' | 'planning'

export function TodayVisitsList() {
  const [view, setView] = useState<ViewMode>('list')
  const { data: visits = [], isLoading } = useTodayVisits()
  const checkIn = useCheckIn()

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-immo-text-muted">
          {visits.length === 0
            ? 'Aucune visite prévue aujourd\'hui.'
            : `${visits.length} visite(s) prévue(s) aujourd'hui.`}
        </div>
        <div className="inline-flex rounded-lg border border-immo-border-default bg-immo-bg-card p-0.5">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
              view === 'list'
                ? 'bg-immo-accent-green/10 text-immo-accent-green'
                : 'text-immo-text-muted hover:text-immo-text-primary'
            }`}
          >
            <List className="h-3 w-3" /> Liste
          </button>
          <button
            onClick={() => setView('planning')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
              view === 'planning'
                ? 'bg-immo-accent-green/10 text-immo-accent-green'
                : 'text-immo-text-muted hover:text-immo-text-primary'
            }`}
          >
            <LayoutGrid className="h-3 w-3" /> Planning
          </button>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-immo-border-default p-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-immo-text-muted/50" />
          <p className="text-sm text-immo-text-muted">Aucune visite prévue aujourd'hui.</p>
        </div>
      ) : view === 'list' ? (
        <ListView visits={visits} onCheckIn={v => checkIn.mutate(v)} checkingIn={checkIn.isPending} />
      ) : (
        <PlanningView visits={visits} onCheckIn={v => checkIn.mutate(v)} checkingIn={checkIn.isPending} />
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   Classic vertical list
   ═════════════════════════════════════════════════════════════ */
function ListView({
  visits, onCheckIn, checkingIn,
}: {
  visits: VisitRow[]
  onCheckIn: (v: VisitRow) => void
  checkingIn: boolean
}) {
  return (
    <div className="space-y-2">
      {visits.map(v => {
        const statusInfo = VISIT_STATUS_LABELS[v.status]
        const hasArrived = v.status === 'confirmed' || v.status === 'completed'

        return (
          <div
            key={v.id}
            className="flex items-center gap-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-4"
          >
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-immo-accent-green/10 text-immo-accent-green">
              <div className="text-lg font-bold leading-none">
                {format(new Date(v.scheduled_at), 'HH:mm')}
              </div>
              <div className="text-[9px] text-immo-text-muted">
                {format(new Date(v.scheduled_at), 'EEE', { locale: fr })}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-immo-text-primary">
                  {v.client?.full_name ?? 'Client inconnu'}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-immo-text-muted">
                {v.client?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {v.client.phone}
                  </span>
                )}
                {v.agent && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> {v.agent.first_name} {v.agent.last_name}
                  </span>
                )}
                {v.project && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {v.project.name}
                  </span>
                )}
              </div>
              {v.notes && (
                <div className="mt-1 line-clamp-1 text-[10px] text-immo-text-muted">
                  {v.notes}
                </div>
              )}
            </div>

            <div className="shrink-0">
              {hasArrived ? (
                <div className="flex items-center gap-1 text-[11px] text-immo-accent-green">
                  <CheckCircle className="h-3.5 w-3.5" /> Accueilli
                </div>
              ) : (
                <button
                  onClick={() => onCheckIn(v)}
                  disabled={checkingIn}
                  className="rounded-lg bg-immo-accent-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-immo-accent-green/90 disabled:opacity-50"
                >
                  Client arrivé
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   Planning view: columns per agent, vertical time axis 8h→20h.
   Reception can see at a glance who is busy, who is free, and
   drop a walk-in on whoever has the next open slot.
   ═════════════════════════════════════════════════════════════ */
function PlanningView({
  visits, onCheckIn, checkingIn,
}: {
  visits: VisitRow[]
  onCheckIn: (v: VisitRow) => void
  checkingIn: boolean
}) {
  // Live "now" cursor, refreshed every minute
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Columns = distinct agents in today's visits, plus a bucket for
  // unassigned visits (rare but possible via legacy data).
  const columns = useMemo(() => {
    const byAgent = new Map<string, { name: string; visits: VisitRow[] }>()
    for (const v of visits) {
      const key = v.agent?.id ?? '__unassigned__'
      const name = v.agent ? `${v.agent.first_name} ${v.agent.last_name}` : 'Non-assigné'
      if (!byAgent.has(key)) byAgent.set(key, { name, visits: [] })
      byAgent.get(key)!.visits.push(v)
    }
    return Array.from(byAgent.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [visits])

  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i),
    [],
  )

  const nowOffset = useMemo(() => {
    const mins = (getHours(now) - DAY_START_HOUR) * 60 + getMinutes(now)
    if (mins < 0 || mins > MINUTES_PER_DAY) return null
    return mins * PX_PER_MINUTE
  }, [now])

  return (
    <div className="overflow-hidden rounded-xl border border-immo-border-default bg-immo-bg-card">
      <div className="overflow-x-auto">
        <div
          className="flex min-w-max"
          style={{ height: MINUTES_PER_DAY * PX_PER_MINUTE + 40 }}
        >
          {/* Time axis */}
          <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-immo-border-default bg-immo-bg-card">
            <div className="h-10 border-b border-immo-border-default" />
            <div className="relative" style={{ height: MINUTES_PER_DAY * PX_PER_MINUTE }}>
              {hours.map(h => {
                const top = (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 -translate-y-1/2 pr-2 text-right text-[10px] font-medium text-immo-text-muted"
                    style={{ top }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agent columns */}
          {columns.map(col => (
            <div
              key={col.id}
              className="relative flex w-56 shrink-0 flex-col border-r border-immo-border-default last:border-r-0"
            >
              <div className="flex h-10 items-center border-b border-immo-border-default bg-immo-bg-card-hover px-3">
                <span className="truncate text-xs font-semibold text-immo-text-primary">
                  {col.name}
                </span>
                <span className="ml-auto text-[10px] text-immo-text-muted">
                  {col.visits.length}
                </span>
              </div>

              <div className="relative flex-1" style={{ height: MINUTES_PER_DAY * PX_PER_MINUTE }}>
                {/* Hour grid lines */}
                {hours.map(h => {
                  const top = (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE
                  return (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-immo-border-default/40"
                      style={{ top }}
                    />
                  )
                })}

                {/* Half-hour ticks */}
                {hours.slice(0, -1).map(h => {
                  const top = (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE + 30 * PX_PER_MINUTE
                  return (
                    <div
                      key={`half-${h}`}
                      className="absolute left-0 right-0 border-t border-dashed border-immo-border-default/20"
                      style={{ top }}
                    />
                  )
                })}

                {/* Now line */}
                {nowOffset !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                    style={{ top: nowOffset }}
                  >
                    <div className="h-2 w-2 shrink-0 -translate-x-1 rounded-full bg-immo-status-red" />
                    <div className="h-px flex-1 bg-immo-status-red" />
                  </div>
                )}

                {/* Visit blocks */}
                {col.visits.map(v => {
                  const d = new Date(v.scheduled_at)
                  const mins = (getHours(d) - DAY_START_HOUR) * 60 + getMinutes(d)
                  if (mins < -30 || mins > MINUTES_PER_DAY) return null
                  const top = Math.max(0, mins * PX_PER_MINUTE)
                  const height = DEFAULT_VISIT_MIN * PX_PER_MINUTE - 2
                  const statusInfo = VISIT_STATUS_LABELS[v.status]
                  const arrived = v.status === 'confirmed' || v.status === 'completed'
                  return (
                    <div
                      key={v.id}
                      className="absolute left-1 right-1 overflow-hidden rounded-md border-l-2 px-2 py-1 text-[10px] shadow-sm transition-opacity"
                      style={{
                        top,
                        height,
                        backgroundColor: `${statusInfo.color}15`,
                        borderLeftColor: statusInfo.color,
                        color: statusInfo.color,
                        opacity: v.status === 'cancelled' ? 0.5 : 1,
                      }}
                      title={`${v.client?.full_name ?? ''} — ${format(d, 'HH:mm')} — ${statusInfo.label}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-immo-text-primary">
                          {format(d, 'HH:mm')}
                        </span>
                        <span className="shrink-0 rounded-full px-1.5 py-px text-[8px] font-bold">
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate font-medium text-immo-text-primary">
                        {v.client?.full_name ?? 'Client'}
                      </div>
                      {v.project && (
                        <div className="truncate text-immo-text-muted">{v.project.name}</div>
                      )}
                      {!arrived && v.status !== 'cancelled' && (
                        <button
                          onClick={() => onCheckIn(v)}
                          disabled={checkingIn}
                          className="mt-1 w-full rounded bg-immo-accent-green px-1.5 py-0.5 text-[9px] font-semibold text-white hover:bg-immo-accent-green/90 disabled:opacity-50"
                        >
                          Client arrivé
                        </button>
                      )}
                      {arrived && (
                        <div className="mt-1 flex items-center gap-1 text-[9px] text-immo-accent-green">
                          <CheckCircle className="h-2.5 w-2.5" /> Accueilli
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
