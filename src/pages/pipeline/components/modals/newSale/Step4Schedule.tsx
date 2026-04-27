import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPrice, formatPriceCompact } from '@/lib/constants'
import { format } from 'date-fns'
import { inputClass, labelClass } from './styles'
import type { SaleFormData, ScheduleLine } from './types'

interface Step4Props {
  formData: SaleFormData
  finalPrice: number
  schedule: ScheduleLine[]
  onChange: (patch: Partial<SaleFormData>) => void
}

export function Step4Schedule({ formData, finalPrice, schedule, onChange }: Step4Props) {
  const downPaymentAmount = Math.round(finalPrice * formData.downPaymentPct / 100)

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange({ installments: !formData.installments })}
          className="flex items-center gap-2 text-sm font-medium text-immo-text-primary"
        >
          <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${formData.installments ? 'bg-immo-accent-green' : 'bg-immo-border-default'}`}>
            <div className={`h-4 w-4 rounded-full bg-white transition-transform ${formData.installments ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          Paiement échelonné
        </button>
      </div>

      {!formData.installments ? (
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-primary px-6 py-10 text-center">
          <p className="text-sm text-immo-text-muted">Paiement intégral — pas d'échéancier</p>
          <p className="mt-1 text-lg font-bold text-immo-accent-green">{formatPrice(finalPrice)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Frequency */}
          <div>
            <Label className={labelClass}>Fréquence des versements</Label>
            <div className="mt-1 flex gap-2">
              {([
                { value: 'monthly' as const, label: 'Mensuel' },
                { value: 'quarterly' as const, label: 'Trimestriel' },
                { value: 'semiannual' as const, label: 'Semestriel' },
              ]).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => onChange({ frequency: f.value })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    formData.frequency === f.value
                      ? 'border-immo-accent-green/50 bg-immo-accent-green/10 text-immo-accent-green'
                      : 'border-immo-border-default text-immo-text-muted hover:border-immo-text-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {schedule.length > 0 && (
              <p className="mt-1 text-[11px] text-immo-accent-green">{schedule.length} versements prévus</p>
            )}
          </div>

          {/* Down payment slider */}
          <div>
            <Label className={labelClass}>Apport initial</Label>
            <div className="mt-2 flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={70}
                step={5}
                value={formData.downPaymentPct}
                onChange={(e) => onChange({ downPaymentPct: Number(e.target.value) })}
                className="flex-1 accent-[#00D4A0]"
              />
              <span className="w-[120px] text-right text-xs font-medium text-immo-text-primary">
                {formData.downPaymentPct}% = {formatPriceCompact(downPaymentAmount)}
              </span>
            </div>
          </div>

          {/* First payment date */}
          <div>
            <Label className={labelClass}>Date du premier versement</Label>
            <Input
              type="date"
              value={formData.firstPaymentDate}
              onChange={(e) => onChange({ firstPaymentDate: e.target.value })}
              className={`mt-1 w-[200px] ${inputClass}`}
            />
          </div>

          {/* Schedule preview */}
          {schedule.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-immo-border-default">
              <table className="w-full">
                <thead>
                  <tr className="bg-immo-bg-card-hover">
                    {['#', 'Date', 'Montant', 'Description'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-immo-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-immo-border-default">
                  {schedule.map((line) => (
                    <tr key={line.number} className={`bg-immo-bg-card ${line.number === 1 ? 'bg-immo-accent-green/5' : ''}`}>
                      <td className="px-3 py-2 text-xs text-immo-text-muted">{line.number}</td>
                      <td className="px-3 py-2 text-xs text-immo-text-primary">{format(new Date(line.date), 'dd/MM/yyyy')}</td>
                      <td className="px-3 py-2 text-xs font-medium text-immo-text-primary">{formatPrice(line.amount)}</td>
                      <td className="px-3 py-2 text-xs text-immo-text-muted">{line.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {formData.deliveryDate && (
            <p className="text-[11px] text-immo-text-muted">
              Le dernier versement est prévu pour le <span className="font-medium text-immo-text-primary">{format(new Date(formData.deliveryDate), 'dd/MM/yyyy')}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
