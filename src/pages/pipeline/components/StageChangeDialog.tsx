import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common'
import { PIPELINE_STAGES } from '@/types'
import type { PipelineStage } from '@/types'

interface StageChangeDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note?: string) => void
  clientName: string
  fromStage: PipelineStage
  toStage: PipelineStage
  loading?: boolean
}

export function StageChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  fromStage,
  toStage,
  loading = false,
}: StageChangeDialogProps) {
  const { t } = useTranslation()
  const [note, setNote] = useState('')

  const from = PIPELINE_STAGES[fromStage]
  const to = PIPELINE_STAGES[toStage]

  function handleConfirm() {
    onConfirm(note.trim() || undefined)
    setNote('')
  }

  function handleClose() {
    setNote('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Changer l'etape" size="sm">
      <div className="space-y-5">
        {/* Client name */}
        <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary px-4 py-3">
          <p className="text-sm font-semibold text-immo-text-primary">{clientName}</p>
        </div>

        {/* Stage transition visual */}
        <div className="flex items-center justify-center gap-4">
          {/* From */}
          <div className="flex items-center gap-2 rounded-lg border border-immo-border-default px-4 py-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: from.color }} />
            <span className="text-sm font-medium text-immo-text-primary">{from.label}</span>
          </div>

          <ArrowRight className="h-5 w-5 text-immo-text-muted" />

          {/* To */}
          <div className="flex items-center gap-2 rounded-lg border-2 px-4 py-2.5" style={{ borderColor: to.color, background: `${to.color}10` }}>
            <span className="h-3 w-3 rounded-full" style={{ background: to.color }} />
            <span className="text-sm font-semibold" style={{ color: to.color }}>{to.label}</span>
          </div>
        </div>

        {/* Note (optional) */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-immo-text-muted">
            <MessageSquare className="h-3.5 w-3.5" />
            Note (optionnelle)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Raison du changement, prochaine action..."
            rows={3}
            className="w-full resize-none rounded-lg border border-immo-border-default bg-immo-bg-card p-3 text-sm text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:outline-none focus:ring-1 focus:ring-immo-accent-green/30"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="text-immo-text-secondary hover:bg-immo-bg-card-hover">
            {t('action.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-immo-accent-green font-semibold text-white hover:bg-immo-accent-green/90"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              t('action.confirm')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
