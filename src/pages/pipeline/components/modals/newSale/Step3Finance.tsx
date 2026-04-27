import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatPriceCompact } from '@/lib/constants'
import type { FinancingMode } from '@/types'
import { inputClass } from './styles'
import type { SaleFormData } from './types'

interface Step3Props {
  formData: SaleFormData
  grandTotal: number
  discountAmount: number
  finalPrice: number
  defaultDelivery: string
  onChange: (patch: Partial<SaleFormData>) => void
}

export function Step3Finance({ formData, grandTotal, discountAmount, finalPrice, defaultDelivery, onChange }: Step3Props) {
  return (
    <div className="space-y-6">
      {/* Discount */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-primary p-4">
        <h4 className="mb-3 text-xs font-semibold text-immo-text-primary">Remise commerciale</h4>
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-lg border border-immo-border-default p-0.5">
            <button
              type="button"
              onClick={() => onChange({ discountType: 'percentage', discountValue: formData.discountValue })}
              className={`rounded-md px-3 py-1 text-[11px] font-medium ${formData.discountType === 'percentage' ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted'}`}
            >
              Pourcentage (%)
            </button>
            <button
              type="button"
              onClick={() => onChange({ discountType: 'fixed', discountValue: formData.discountValue })}
              className={`rounded-md px-3 py-1 text-[11px] font-medium ${formData.discountType === 'fixed' ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted'}`}
            >
              Montant fixe
            </button>
            {formData.discountType && (
              <button
                type="button"
                onClick={() => onChange({ discountType: '', discountValue: 0 })}
                className="rounded-md px-2 py-1 text-[11px] text-immo-text-muted hover:text-immo-status-red"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {formData.discountType && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={formData.discountValue || ''}
                onChange={(e) => onChange({ discountValue: Number(e.target.value) })}
                placeholder={formData.discountType === 'percentage' ? '10' : '500000'}
                className={`h-9 w-[140px] ${inputClass}`}
              />
              {discountAmount > 0 && (
                <span className="text-xs text-immo-status-orange">-{formatPriceCompact(discountAmount)}</span>
              )}
            </div>
          )}
        </div>
        {discountAmount > 0 && (
          <p className="mt-2 text-xs text-immo-text-muted">
            {formatPriceCompact(grandTotal)} - {formatPriceCompact(discountAmount)} = <span className="font-semibold text-immo-accent-green">{formatPriceCompact(finalPrice)}</span>
          </p>
        )}
      </div>

      {/* Financing mode */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-primary p-4">
        <h4 className="mb-3 text-xs font-semibold text-immo-text-primary">Mode de financement</h4>
        <div className="space-y-2">
          {([
            { value: 'comptant' as FinancingMode, label: 'Comptant', desc: 'Paiement intégral ou échelonné sans crédit' },
            { value: 'credit' as FinancingMode, label: 'Crédit', desc: 'Financement via établissement bancaire ou employeur' },
            { value: 'mixte' as FinancingMode, label: 'Mixte', desc: 'Apport personnel + crédit bancaire' },
          ]).map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange({ financingMode: mode.value })}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                formData.financingMode === mode.value
                  ? 'border-immo-accent-green/50 bg-immo-accent-green/5'
                  : 'border-immo-border-default hover:border-immo-text-muted'
              }`}
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                formData.financingMode === mode.value ? 'border-immo-accent-green bg-immo-accent-green' : 'border-immo-border-default'
              }`}>
                {formData.financingMode === mode.value && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-immo-text-primary">{mode.label}</p>
                <p className="text-[11px] text-immo-text-muted">{mode.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Delivery date */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-primary p-4">
        <h4 className="mb-3 text-xs font-semibold text-immo-text-primary">Date de livraison prévue</h4>
        <Input
          type="date"
          value={formData.deliveryDate || defaultDelivery}
          onChange={(e) => onChange({ deliveryDate: e.target.value })}
          className={`w-[200px] ${inputClass}`}
        />
        <p className="mt-2 text-[11px] text-immo-text-muted">L'échéancier sera calculé jusqu'à cette date</p>
      </div>
    </div>
  )
}
