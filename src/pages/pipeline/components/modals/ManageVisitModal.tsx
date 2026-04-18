import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, CalendarClock, XCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { Modal, ConfirmDialog } from '@/components/common'
import type { PipelineStage } from '@/types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { PlanVisitModal } from './PlanVisitModal'

interface VisitInfo {
  id: string
  scheduled_at: string
  visit_type: string
  status: string
  notes: string | null
}

interface ClientInfo {
  id: string
  full_name: string
  phone: string
  pipeline_stage: PipelineStage

}

interface ManageVisitModalProps {
  isOpen: boolean
  onClose: () => void
  visit: VisitInfo | null
  client: ClientInfo | null
}

export function ManageVisitModal({ isOpen, onClose, visit, client }: ManageVisitModalProps) {
  const userId = useAuthStore((s) => s.session?.user?.id)
  const qc = useQueryClient()

  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [moveToRelaunch, setMoveToRelaunch] = useState(false)

  const confirmVisit = useMutation({
    mutationFn: async () => {
      if (!visit || !client || !userId) return

      // Update visit status
      const { error: vErr } = await supabase
        .from('visits')
        .update({ status: 'confirmed' } as never)
        .eq('id', visit.id)
      if (vErr) { handleSupabaseError(vErr); throw vErr }

      // Move client to visite_confirmee if in earlier stage
      const confirmableStages: PipelineStage[] = ['accueil', 'visite_a_gerer']
      if (confirmableStages.includes(client.pipeline_stage)) {
        await supabase.from('clients').update({ pipeline_stage: 'visite_confirmee' } as never).eq('id', client.id)
      }

      // History
      await supabase.from('history').insert({
        
        client_id: client.id,
        agent_id: userId,
        type: 'visit_confirmed',
        title: `Visite confirmée pour le ${format(new Date(visit.scheduled_at), 'dd/MM/yyyy HH:mm')}`,
        metadata: { visit_id: visit.id },
      } as never)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Visite confirmée')
      onClose()
    },
  })

  const cancelVisit = useMutation({
    mutationFn: async () => {
      if (!visit || !client || !userId) return

      // Cancel visit
      const { error: vErr } = await supabase
        .from('visits')
        .update({ status: 'cancelled' } as never)
        .eq('id', visit.id)
      if (vErr) { handleSupabaseError(vErr); throw vErr }

      // Optionally move to relancement
      if (moveToRelaunch) {
        await supabase.from('clients').update({ pipeline_stage: 'relancement' } as never).eq('id', client.id)
      }

      // History
      await supabase.from('history').insert({
        
        client_id: client.id,
        agent_id: userId,
        type: 'stage_change',
        title: `Visite annulée${moveToRelaunch ? ' — client passé en relancement' : ''}`,
        metadata: { visit_id: visit.id, moved_to_relaunch: moveToRelaunch },
      } as never)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Visite annulée')
      setShowCancelConfirm(false)
      onClose()
    },
  })

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['client-visits'] })
    qc.invalidateQueries({ queryKey: ['clients'] })
    qc.invalidateQueries({ queryKey: ['client-history'] })
    qc.invalidateQueries({ queryKey: ['client-detail'] })
    qc.invalidateQueries({ queryKey: ['pipeline-stats'] })
  }

  if (!visit || !client) return null

  // If reschedule is open, show PlanVisit instead
  if (showReschedule) {
    return (
      <PlanVisitModal
        isOpen
        onClose={() => { setShowReschedule(false); onClose() }}
        client={client}
        prefillDate={visit.scheduled_at.split('T')[0]}
        prefillTime={format(new Date(visit.scheduled_at), 'HH:mm')}
        prefillType={visit.visit_type}
        prefillNotes={visit.notes ?? ''}
      />
    )
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gérer la visite" subtitle={`Choisissez une action pour ${client.full_name}`} size="sm">
        <div className="space-y-3">
          {/* Visit info */}
          <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary px-4 py-3">
            <p className="text-sm text-immo-text-primary">
              {format(new Date(visit.scheduled_at), 'EEEE dd/MM/yyyy à HH:mm', { locale: undefined })}
            </p>
            <p className="mt-0.5 text-[11px] text-immo-text-muted">
              {visit.visit_type === 'on_site' ? 'Sur site' : visit.visit_type === 'office' ? 'Bureau' : 'Virtuel'}
              {visit.notes && ` — ${visit.notes}`}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* Confirm */}
            <button
              onClick={() => confirmVisit.mutate()}
              disabled={confirmVisit.isPending}
              className="flex w-full items-center gap-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-4 transition-colors hover:border-immo-accent-green/40 hover:bg-immo-accent-green/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-immo-accent-green/15">
                <CheckCircle className="h-5 w-5 text-immo-accent-green" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-immo-text-primary">Confirmer la visite</p>
                <p className="text-[11px] text-immo-text-muted">Le client a confirmé sa présence</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-immo-text-muted" />
            </button>

            {/* Reschedule */}
            <button
              onClick={() => setShowReschedule(true)}
              className="flex w-full items-center gap-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-4 transition-colors hover:border-immo-status-orange/40 hover:bg-immo-status-orange/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-immo-status-orange/15">
                <CalendarClock className="h-5 w-5 text-immo-status-orange" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-immo-text-primary">Reprogrammer</p>
                <p className="text-[11px] text-immo-text-muted">Choisir une nouvelle date et heure</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-immo-text-muted" />
            </button>

            {/* Cancel */}
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex w-full items-center gap-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-4 transition-colors hover:border-immo-status-red/40 hover:bg-immo-status-red/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-immo-status-red/15">
                <XCircle className="h-5 w-5 text-immo-status-red" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-immo-text-primary">Annuler la visite</p>
                <p className="text-[11px] text-immo-text-muted">La visite ne sera pas effectuée</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-immo-text-muted" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel confirmation */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => cancelVisit.mutate()}
        title="Annuler cette visite ?"
        description="La visite sera marquée comme annulée."
        confirmLabel="Annuler la visite"
        confirmVariant="danger"
        loading={cancelVisit.isPending}
      >
        {/* Extra option: move to relaunch */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="relaunch"
            checked={moveToRelaunch}
            onChange={(e) => setMoveToRelaunch(e.target.checked)}
            className="h-4 w-4 rounded border-immo-border-default bg-immo-bg-primary accent-immo-accent-green"
          />
          <label htmlFor="relaunch" className="text-xs text-immo-text-secondary">
            Passer le client en &quot;Relancement&quot;
          </label>
        </div>
      </ConfirmDialog>
    </>
  )
}
