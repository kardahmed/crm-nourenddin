import { useTranslation } from 'react-i18next'
import { FileText, Download, Printer, Eye, CheckCircle } from 'lucide-react'
import { formatPrice, formatPriceCompact } from '@/lib/constants'
import { UNIT_TYPE_LABELS } from '@/types'
import { format } from 'date-fns'
import { inputClass } from './styles'
import type { ClientInfo, AvailableUnit, Amenity, ScheduleLine } from './types'

interface Step5Props {
  client: ClientInfo
  projectName: string
  selectedUnitsData: AvailableUnit[]
  amenities: Amenity[]
  finalPrice: number
  discountAmount: number
  schedule: ScheduleLine[]
  internalNotes: string
  onNotesChange: (v: string) => void
}

export function Step5Validation({ client, projectName, selectedUnitsData, amenities, finalPrice, discountAmount, schedule, internalNotes, onNotesChange }: Step5Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-immo-accent-green/30 bg-immo-accent-green/5 px-4 py-3">
        <CheckCircle className="h-5 w-5 text-immo-accent-green" />
        <p className="text-sm font-medium text-immo-accent-green">Prêt à finaliser</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Recap */}
        <div className="space-y-4">
          {/* Identification */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase text-immo-text-muted">Identification</p>
            <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary p-3">
              <p className="text-sm text-immo-text-primary">{client.full_name}</p>
              <p className="text-xs text-immo-text-muted">{projectName}</p>
            </div>
          </div>

          {/* Units */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase text-immo-text-muted">Biens sélectionnés</p>
            <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary">
              {selectedUnitsData.map((u, i) => (
                <div key={u.id} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-immo-border-default' : ''}`}>
                  <div>
                    <span className="text-xs font-medium text-immo-text-primary">{u.code}</span>
                    <span className="ml-2 text-[11px] text-immo-text-muted">{UNIT_TYPE_LABELS[u.type]}{u.subtype ? ` ${u.subtype}` : ''}</span>
                  </div>
                  <span className="text-xs font-medium text-immo-text-primary">{u.price != null ? formatPrice(u.price) : '-'}</span>
                </div>
              ))}
              {amenities.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-t border-immo-border-default px-3 py-2">
                  <span className="text-xs text-immo-text-muted">{a.description}</span>
                  <span className="text-xs text-immo-text-primary">{formatPrice(a.price)}</span>
                </div>
              ))}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between border-t border-immo-border-default px-3 py-2">
                  <span className="text-xs text-immo-status-orange">Remise</span>
                  <span className="text-xs text-immo-status-orange">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-immo-accent-green/30 bg-immo-accent-green/5 px-3 py-2.5">
                <span className="text-xs font-semibold text-immo-accent-green">Total</span>
                <span className="text-sm font-bold text-immo-accent-green">{formatPrice(finalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Schedule summary */}
          {schedule.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase text-immo-text-muted">Échéancier</p>
              <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary p-3 text-xs">
                <div className="flex justify-between text-immo-text-muted">
                  <span>Premier versement</span>
                  <span className="text-immo-text-primary">{formatPriceCompact(schedule[0].amount)} — {format(new Date(schedule[0].date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="mt-1 flex justify-between text-immo-text-muted">
                  <span>Dernier versement</span>
                  <span className="text-immo-text-primary">{formatPriceCompact(schedule[schedule.length - 1].amount)} — {format(new Date(schedule[schedule.length - 1].date), 'dd/MM/yyyy')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Documents + Notes */}
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase text-immo-text-muted">Documents à générer</p>
            <div className="space-y-2">
              {[
                { name: 'Contrat de Vente', required: true },
                { name: 'Échéancier de Paiement', required: false },
                { name: 'Bon de Réservation', required: false },
              ].map((doc) => (
                <div key={doc.name} className="flex items-center justify-between rounded-lg border border-immo-border-default bg-immo-bg-primary px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-immo-accent-blue" />
                    <span className="text-xs text-immo-text-primary">{doc.name}</span>
                    {doc.required && (
                      <span className="rounded bg-immo-status-orange-bg px-1.5 py-0.5 text-[9px] font-medium text-immo-status-orange">REQUIS</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button className="rounded p-1 text-immo-text-muted hover:bg-immo-bg-card-hover hover:text-immo-accent-blue" title="Aperçu">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded p-1 text-immo-text-muted hover:bg-immo-bg-card-hover hover:text-immo-accent-green" title={t('action.download')}>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded p-1 text-immo-text-muted hover:bg-immo-bg-card-hover hover:text-immo-text-primary" title={t('action.print')}>
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase text-immo-text-muted">Notes internes</p>
            <textarea
              value={internalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notes internes sur cette vente..."
              rows={4}
              className={`w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-immo-accent-green ${inputClass}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
