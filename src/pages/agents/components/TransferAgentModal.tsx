import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, TriangleAlert, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Modal, LoadingSpinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PIPELINE_STAGES } from '@/types'
import type { PipelineStage } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  agentId: string | null
  agentName: string
}

interface ClientRow {
  id: string
  full_name: string
  phone: string | null
  pipeline_stage: PipelineStage
  created_at: string
}

interface CandidateAgent {
  id: string
  first_name: string
  last_name: string
  role: 'agent' | 'admin'
  clients_count: number
}

type DepartureReason = 'resignation' | 'dismissal' | 'leave' | 'reassignment' | 'other'

const DEPARTURE_REASONS: DepartureReason[] = [
  'resignation',
  'dismissal',
  'leave',
  'reassignment',
  'other',
]

/**
 * Transfer-before-deactivate flow. The admin must map every client of
 * the outgoing agent to an active replacement before the agent's
 * status can flip to inactive. The database RPC enforces the same
 * contract atomically — the UI just makes it ergonomic.
 */
export function TransferAgentModal({ isOpen, onClose, agentId, agentName }: Props) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const reasonLabel = (r: DepartureReason) => t(`transfer.reason_${r}`)

  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [bulkAgent, setBulkAgent] = useState<string>('')
  const [reason, setReason] = useState<DepartureReason>('resignation')
  const [reasonNote, setReasonNote] = useState('')

  // Clients currently owned by the outgoing agent.
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['agent-clients-for-transfer', agentId],
    enabled: isOpen && !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, pipeline_stage, created_at')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ClientRow[]
    },
  })

  // Active agents (excluding the one being deactivated) with their
  // current client count so the admin can pick wisely.
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['transfer-candidates', agentId],
    enabled: isOpen && !!agentId,
    queryFn: async () => {
      const [usersRes, clientsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .in('role', ['agent', 'admin'])
          .eq('status', 'active')
          .neq('id', agentId!)
          .order('role', { ascending: true })
          .order('first_name'),
        supabase.from('clients').select('agent_id').not('agent_id', 'is', null),
      ])
      if (usersRes.error) throw usersRes.error
      if (clientsRes.error) throw clientsRes.error
      const users = (usersRes.data ?? []) as Array<{
        id: string
        first_name: string
        last_name: string
        role: 'agent' | 'admin'
      }>
      const rows = (clientsRes.data ?? []) as Array<{ agent_id: string }>
      return users.map(u => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        clients_count: rows.filter(r => r.agent_id === u.id).length,
      })) as CandidateAgent[]
    },
  })

  // Reset local state whenever the modal opens for a new agent.
  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when opening the modal for a different agent
    setAssignments({})
    setBulkAgent('')
    setReason('resignation')
    setReasonNote('')
  }, [isOpen, agentId])

  const unassigned = useMemo(
    () => clients.filter(c => !assignments[c.id]),
    [clients, assignments],
  )

  const transfer = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('Agent manquant')
      const transfers = clients.map(c => ({
        client_id: c.id,
        new_agent_id: assignments[c.id],
      }))
      const departureText = reasonNote.trim()
        ? `${reasonLabel(reason)} — ${reasonNote.trim()}`
        : reasonLabel(reason)
      const { data, error } = await supabase.rpc(
        'transfer_agent_clients_and_deactivate' as never,
        {
          p_agent_id: agentId,
          p_transfers: transfers,
          p_departure_reason: departureText,
        } as never,
      )
      if (error) throw error
      return data as {
        clients_transferred: number
        visits_transferred: number
        tasks_transferred: number
      }
    },
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['agents-list'] })
      qc.invalidateQueries({ queryKey: ['unassigned-queue'] })
      qc.invalidateQueries({ queryKey: ['reception-agent-loads'] })
      toast.success(
        `${result.clients_transferred} client(s) transféré(s), ${result.visits_transferred} visite(s) et ${result.tasks_transferred} tâche(s) ré-assignée(s). Agent désactivé.`,
        { duration: 10000 },
      )
      onClose()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Le transfert a échoué')
    },
  })

  const deactivateNoClients = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('Agent manquant')
      const { error } = await supabase
        .from('users')
        .update({ status: 'inactive' } as never)
        .eq('id', agentId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents-list'] })
      toast.success('Agent désactivé')
      onClose()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Échec')
    },
  })

  function applyBulk() {
    if (!bulkAgent) return
    const next: Record<string, string> = {}
    for (const c of clients) next[c.id] = bulkAgent
    setAssignments(next)
  }

  const loading = loadingClients || loadingCandidates
  const noClients = !loading && clients.length === 0
  const canSubmit = !loading && unassigned.length === 0 && clients.length > 0
  const submitting = transfer.isPending || deactivateNoClients.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={`Désactiver ${agentName}`}
      subtitle="Transférer ses clients avant la désactivation"
      size="lg"
    >
      {loading ? (
        <LoadingSpinner size="md" className="h-48" />
      ) : noClients ? (
        <div className="space-y-4">
          <p className="text-sm text-immo-text-secondary">
            Cet agent n'a aucun client actif. La désactivation est directe.
          </p>
          <div className="flex justify-end gap-2 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button
              onClick={() => deactivateNoClients.mutate()}
              disabled={submitting}
              className="bg-immo-status-red font-semibold text-white hover:bg-immo-status-red/90"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Ban className="mr-1.5 h-4 w-4" /> Désactiver
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-immo-status-orange/40 bg-immo-status-orange/5 p-3 text-[12px] text-immo-text-primary">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-immo-status-orange" />
            <div>
              <strong>{clients.length} client(s)</strong> sont actuellement assignés à cet agent. Ils doivent tous être transférés avant la désactivation. L'historique des interactions passées est conservé intégralement.
            </div>
          </div>

          {candidates.length === 0 && (
            <div className="rounded-lg border border-immo-status-red/40 bg-immo-status-red/5 p-3 text-[12px] text-immo-text-primary">
              Aucun agent ou admin actif disponible comme cible. Crée d'abord un nouveau compte actif, puis relance ce transfert.
            </div>
          )}

          {/* Bulk action */}
          <div className="rounded-lg border border-immo-border-default bg-immo-bg-card p-3">
            <Label className="text-[11px] font-medium text-immo-text-muted">
              Transfert groupé (optionnel)
            </Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                value={bulkAgent}
                onChange={e => setBulkAgent(e.target.value)}
                className="h-8 flex-1 rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
              >
                <option value="">— Choisir un agent cible —</option>
                {candidates.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name}
                    {a.role === 'admin' ? ' (admin, temporaire)' : ` (${a.clients_count} clients)`}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={applyBulk}
                disabled={!bulkAgent}
                variant="outline"
                className="h-8 border-immo-border-default text-xs"
              >
                <ArrowRightLeft className="mr-1 h-3 w-3" /> Tout transférer
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-immo-text-muted">
              Remplit toutes les lignes ci-dessous avec l'agent choisi. Tu peux ensuite ajuster client par client.
            </p>
          </div>

          {/* Per-client mapping */}
          <div className="max-h-[260px] overflow-y-auto rounded-lg border border-immo-border-default">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-immo-bg-card-hover">
                <tr className="text-left text-[10px] uppercase tracking-wide text-immo-text-muted">
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Étape</th>
                  <th className="px-3 py-2 font-medium">Nouvel agent *</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-immo-border-default">
                {clients.map(c => {
                  const stage = PIPELINE_STAGES[c.pipeline_stage]
                  const picked = assignments[c.id] ?? ''
                  return (
                    <tr key={c.id} className="bg-immo-bg-card">
                      <td className="px-3 py-2">
                        <div className="font-medium text-immo-text-primary">{c.full_name}</div>
                        {c.phone && (
                          <div className="text-[10px] text-immo-text-muted">{c.phone}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                          style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                        >
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={picked}
                          onChange={e =>
                            setAssignments(prev => ({ ...prev, [c.id]: e.target.value }))
                          }
                          className={`h-7 w-full rounded-md border px-2 text-[11px] ${
                            picked
                              ? 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary'
                              : 'border-immo-status-orange bg-immo-status-orange/5 text-immo-text-primary'
                          }`}
                        >
                          <option value="">— À choisir —</option>
                          {candidates.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.first_name} {a.last_name}
                              {a.role === 'admin' ? ' (admin)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Departure reason */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px] font-medium text-immo-text-muted">
                Motif du départ *
              </Label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as DepartureReason)}
                className="mt-1 h-9 w-full rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary"
              >
                {DEPARTURE_REASONS.map(r => (
                  <option key={r} value={r}>
                    {reasonLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-medium text-immo-text-muted">
                Précision (optionnel)
              </Label>
              <input
                type="text"
                value={reasonNote}
                onChange={e => setReasonNote(e.target.value)}
                placeholder="Ex: retour en France, congé maternité…"
                className="mt-1 h-9 w-full rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary placeholder:text-immo-text-muted"
              />
            </div>
          </div>

          {unassigned.length > 0 && (
            <p className="text-[11px] text-immo-status-orange">
              {unassigned.length} client(s) sans agent cible. Complétez la mapping avant de valider.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Annuler
            </Button>
            <Button
              onClick={() => transfer.mutate()}
              disabled={!canSubmit || submitting}
              className="bg-immo-status-red font-semibold text-white hover:bg-immo-status-red/90 disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <ArrowRightLeft className="mr-1.5 h-4 w-4" /> Transférer et désactiver
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
