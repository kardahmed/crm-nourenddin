import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inputClass, labelClass } from './styles'
import type { Amenity } from './types'

export function AddAmenityForm({ onAdd, onCancel }: { onAdd: (a: Amenity) => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')

  function handle() {
    if (!desc || !price) return
    onAdd({ id: crypto.randomUUID(), description: desc, price: Number(price) })
    setDesc(''); setPrice('')
  }

  return (
    <div className="rounded-lg border border-immo-accent-green/30 bg-immo-accent-green/5 p-4">
      <div className="space-y-3">
        <div>
          <Label className={labelClass}>{t('sale_modal.amenity_description')}</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('sale_modal.amenity_description_placeholder')} className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <Label className={labelClass}>{t('sale_modal.amenity_price')}</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('sale_modal.amenity_price_placeholder')} className={`mt-1 ${inputClass}`} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-xs text-immo-text-muted">{t('sale_modal.cancel')}</Button>
          <Button onClick={handle} disabled={!desc || !price} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
            {t('sale_modal.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}
