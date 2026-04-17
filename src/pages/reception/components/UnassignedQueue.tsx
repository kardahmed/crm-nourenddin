import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Inbox, Phone, Sparkles, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { LoadingSpinner } from '@/components/common'
import { SOURCE_LABELS } from '@/types'
import type { ClientSource } from '@/types'
import {
  useReceptionSettings,
  useAgentLoads,
  pickAgent,
  MODE_LABELS,
} from '@/hooks/useReceptionAssignment'

interface UnassignedClient {
  id: string
  full_name: string
  phone: string
  source: ClientSource
  notes: string | null
  created_at: string
}

export function UnassignedQueue() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.session?.user?.id)
  const { data: settings } = useReceptionSettings()
  const { data: agentLoads = [] } = useAgentLoads(settings?.maxLeadsPerDay ?? 10)

  const [selectedAgent, setSelectedAgent] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const suggested = useMemo(() => {
    if (!settings) return null
    return pickAgent(settings.mode, agentLoads)
  }, [settings, agentLoads])

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['unassigned-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, source, notes, created_at')
        .is('agent_id', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as UnassignedClient[]
    },
  })

  const assign = useMutation({
    mutationFn: async ({ clientId, agentId }: { clientId: string; agentId: string }) => {
      const reason = reasons[clientId]?.trim() ?? ''
      const isOverride =
        suggested !== null && agentId !== suggested.id && settings?.mode !== 'manual'

      if (
        isOverride &&
        settings?.overrideRequiresReason &&
        reason.length < 3
      ) {
        throw new Error('Un motif est obligatoire quand vous bypassez l\'agent suggéré.')
      }

      const { error: upErr } = await supabase
        .from('clients')
        .update({ agent_id: agentId } as never)
        .eq('id', clientId)
      if (upErr) { handleSupabaseError(upErr); throw upErr }

      // history: reassignment (even for first-time assignment from null)
      await supabase.from('history').insert({
        client_id: clientId,
        agent_id: agentId,
        type: 'reassignment',
        title: isOverride
          ? `Attribution manuelle (motif: ${reason})`
          : 'Attribution automatique',
        description: `Assigné depuis la file non-assignés (mode ${settings ? MODE_LABELS[settings.mode] : '—'}).`,
        metadata: {
          reassigned_by: userId,
          from_agent_id: null,
          to_agent_id: agentId,
          suggested_agent_id: suggested?.id ?? null,
          mode: settings?.mode,
          reason: reason || null,
        },
      } as never)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unassigned-queue'] })
      qc.invalidateQueries({ queryKey: ['reception-metrics'] })
      qc.invalidateQueries({ queryKey: ['reception-agent-loads'] })
      toast.success('Client assigné')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    },
  })

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-immo-border-default p-10 text-center">
        <Inbox className="mx-auto mb-3 h-8 w-8 text-immo-text-muted/50" />
        <p className="text-sm text-immo-text-muted">File d'attente vide — tous les leads sont assignés.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {suggested && (
        <div className="flex items-center gap-2 rounded-lg border border-immo-accent-green/30 bg-immo-accent-green/5 px-3 py-2 text-[11px] text-immo-accent-green">
          <Sparkles className="h-3 w-3" />
          <span>
            Agent suggéré par le mode <strong>{MODE_LABELS[settings!.mode]}</strong> : {suggested.first_name} {suggested.last_name}
          </span>
        </div>
      )}

      {clients.map(c => {
        const pick = selectedAgent[c.id] ?? suggested?.id ?? ''
        const isOverride =
          suggested !== null && pick !== '' && pick !== suggested.id && settings?.mode !== 'manual'

        return (
          <div
            key={c.id}
            className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-immo-text-primary">
                    {c.full_name}
                  </span>
                  <span className="rounded-full bg-immo-status-orange/10 px-2 py-0.5 text-[9px] font-semibold text-immo-status-orange">
                    {SOURCE_LABELS[c.source]}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-immo-text-muted">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </span>
                  <span>créé {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}</span>
                </div>
                {c.notes && (
                  <div className="mt-1 line-clamp-2 text-[10px] text-immo-text-muted">
                    {c.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={pick}
                onChange={e => setSelectedAgent(s => ({ ...s, [c.id]: e.target.value }))}
                className="h-8 rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
              >
                <option value="">— Choisir un agent —</option>
                {agentLoads.map(a => (
                  <option key={a.id} value={a.id} disabled={a.at_cap}>
                    {a.first_name} {a.last_name} ({a.leads_today}/j, {a.active_clients} actifs)
                    {a.at_cap ? ' — plafond' : ''}
                  </option>
                ))}
              </select>

              {isOverride && settings?.overrideRequiresReason && (
                <input
                  value={reasons[c.id] ?? ''}
                  onChange={e => setReasons(r => ({ ...r, [c.id]: e.target.value }))}
                  placeholder="Motif (obligatoire)"
                  className="h-8 flex-1 rounded-md border border-immo-status-orange/50 bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
                />
              )}

              <button
                onClick={() => pick && assign.mutate({ clientId: c.id, agentId: pick })}
                disabled={!pick || assign.isPending}
                className="flex items-center gap-1 rounded-lg bg-immo-accent-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-immo-accent-green/90 disabled:opacity-50"
              >
                <UserCheck className="h-3 w-3" /> Assigner
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
