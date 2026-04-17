import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CheckCircle, Clock, MapPin, Phone, UserCheck } from 'lucide-react'
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

export function TodayVisitsList() {
  const qc = useQueryClient()

  const { data: visits = [], isLoading } = useQuery({
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

  // Check-in — mark the visit as confirmed and log a history event so the
  // assigned agent sees the client has arrived.
  const checkIn = useMutation({
    mutationFn: async (v: VisitRow) => {
      if (!v.client) throw new Error('Client manquant')

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
      toast.success('Client accueilli — agent notifié')
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    },
  })

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />

  if (visits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-immo-border-default p-10 text-center">
        <Clock className="mx-auto mb-3 h-8 w-8 text-immo-text-muted/50" />
        <p className="text-sm text-immo-text-muted">Aucune visite prévue aujourd'hui.</p>
      </div>
    )
  }

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
                  style={{
                    backgroundColor: `${statusInfo.color}20`,
                    color: statusInfo.color,
                  }}
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
                  onClick={() => checkIn.mutate(v)}
                  disabled={checkIn.isPending}
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
