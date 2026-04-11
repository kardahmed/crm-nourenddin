import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'

interface CallLogModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  tenantId: string
  agentId: string
  onSuccess?: () => void
}

export function CallLogModal({ isOpen, onClose, clientId, clientName, tenantId, agentId, onSuccess }: CallLogModalProps) {
  const [duration, setDuration] = useState('5')
  const [result, setResult] = useState<'interested' | 'callback' | 'not_interested'>('interested')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const RESULTS = [
    { value: 'interested' as const, label: 'Interesse', color: 'text-immo-accent-green' },
    { value: 'callback' as const, label: 'A rappeler', color: 'text-immo-status-orange' },
    { value: 'not_interested' as const, label: 'Pas interesse', color: 'text-immo-status-red' },
  ]

  async function handleSubmit() {
    setLoading(true)
    try {
      const { error } = await supabase.from('history').insert({
        tenant_id: tenantId,
        client_id: clientId,
        agent_id: agentId,
        type: 'call',
        title: `Appel ${duration} min — ${RESULTS.find(r => r.value === result)?.label}`,
        description: notes || null,
        metadata: { duration: Number(duration), result, notes },
      } as never)

      if (error) { handleSupabaseError(error); throw error }

      toast.success('Appel enregistre')
      setDuration('5'); setNotes(''); setResult('interested')
      onSuccess?.()
      onClose()
    } catch {
      // handled by handleSupabaseError
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enregistrer un appel" subtitle={clientName} size="sm">
      <div className="space-y-4">
        {/* Duration */}
        <div>
          <Label className="text-xs text-immo-text-muted">Duree (minutes)</Label>
          <Input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className={inputClass} />
        </div>

        {/* Result */}
        <div>
          <Label className="text-xs text-immo-text-muted">Resultat</Label>
          <div className="mt-1.5 flex gap-2">
            {RESULTS.map(r => (
              <button
                key={r.value}
                onClick={() => setResult(r.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  result === r.value
                    ? 'border-immo-accent-green/30 bg-immo-accent-green/5 text-immo-accent-green'
                    : 'border-immo-border-default text-immo-text-muted hover:text-immo-text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs text-immo-text-muted">Notes (optionnel)</Label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Resume de l'appel..."
            className="mt-1 w-full resize-none rounded-lg border border-immo-border-default bg-immo-bg-primary p-3 text-sm text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
          <Button variant="ghost" onClick={onClose} className="text-immo-text-secondary">Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-immo-accent-green font-semibold text-white hover:bg-immo-accent-green/90">
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
