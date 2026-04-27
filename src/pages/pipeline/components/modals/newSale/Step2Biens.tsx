import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search, LayoutGrid, List, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice, formatPriceCompact } from '@/lib/constants'
import { UNIT_TYPE_LABELS, UNIT_SUBTYPE_LABELS } from '@/types'
import type { UnitSubtype } from '@/types'
import { format, differenceInMonths } from 'date-fns'
import { AddAmenityForm } from './AddAmenityForm'
import { inputClass } from './styles'
import type { AvailableUnit, Amenity } from './types'

interface Step2Props {
  units: AvailableUnit[]
  selectedUnits: string[]
  onToggleUnit: (id: string) => void
  amenities: Amenity[]
  onAddAmenity: (a: Amenity) => void
  onRemoveAmenity: (id: string) => void
}

export function Step2Biens({ units, selectedUnits, onToggleUnit, amenities, onAddAmenity, onRemoveAmenity }: Step2Props) {
  const { t } = useTranslation()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [subTab, setSubTab] = useState<'units' | 'parkings' | 'options'>('units')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showAddAmenity, setShowAddAmenity] = useState(false)

  const regularUnits = useMemo(() => units.filter((u) => u.type !== 'parking'), [units])
  const parkingUnits = useMemo(() => units.filter((u) => u.type === 'parking'), [units])

  const displayedUnits = subTab === 'parkings' ? parkingUnits : regularUnits

  const filtered = useMemo(() => {
    let list = displayedUnits
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((u) => u.code.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') {
      list = list.filter((u) => u.subtype === typeFilter)
    }
    list = [...list].sort((a, b) => {
      const diff = (a.price ?? 0) - (b.price ?? 0)
      return sortDir === 'asc' ? diff : -diff
    })
    return list
  }, [displayedUnits, search, typeFilter, sortDir])

  const subtypes = useMemo(() => {
    const set = new Set<string>()
    displayedUnits.forEach((u) => { if (u.subtype) set.add(u.subtype) })
    return Array.from(set)
  }, [displayedUnits])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-immo-text-primary">{t('sale_modal.select_units_title')}</h3>
        <p className="text-[11px] text-immo-text-muted">{t('sale_modal.select_units_subtitle')}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-immo-border-default p-0.5">
          {([
            { key: 'units' as const, label: t('sale_modal.tab_units', { count: regularUnits.length }) },
            { key: 'parkings' as const, label: t('sale_modal.tab_parkings', { count: parkingUnits.length }) },
            { key: 'options' as const, label: t('sale_modal.tab_options') },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                subTab === tab.key ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted hover:text-immo-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {subTab !== 'options' && (
          <div className="flex gap-1 rounded-lg border border-immo-border-default p-0.5">
            <button onClick={() => setView('grid')} className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted'}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView('list')} className={`rounded-md p-1.5 ${view === 'list' ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted'}`}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Units / Parkings tab */}
      {subTab !== 'options' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-immo-text-muted" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('sale_modal.code_placeholder')} className={`h-8 w-[150px] pl-8 text-xs ${inputClass}`} />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
            >
              <option value="all">{t('sale_modal.all_subtypes')}</option>
              {subtypes.map((st) => (
                <option key={st} value={st}>{UNIT_SUBTYPE_LABELS[st as UnitSubtype] ?? st}</option>
              ))}
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
              className="h-8 rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
            >
              <option value="asc">{t('sale_modal.price_asc')}</option>
              <option value="desc">{t('sale_modal.price_desc')}</option>
            </select>
            {selectedUnits.length > 0 && (
              <span className="ml-auto text-[11px] font-medium text-immo-accent-green">
                {t('sale_modal.selected_count', { count: selectedUnits.length })}
              </span>
            )}
          </div>

          {/* Grid / List */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-immo-text-muted">{t('sale_modal.no_unit_available')}</div>
          ) : view === 'grid' ? (
            <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto">
              {filtered.map((u) => {
                const selected = selectedUnits.includes(u.id)
                const isClose = u.delivery_date && differenceInMonths(new Date(u.delivery_date), new Date()) < 6
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onToggleUnit(u.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? 'border-immo-accent-green/50 bg-immo-accent-green/5'
                        : 'border-immo-border-default bg-immo-bg-card hover:border-immo-text-muted'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-immo-text-primary">{u.code}</span>
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                        selected ? 'border-immo-accent-green bg-immo-accent-green' : 'border-immo-border-default'
                      }`}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-immo-text-muted">
                      {UNIT_TYPE_LABELS[u.type]}{u.subtype ? ` ${u.subtype}` : ''} · Ét.{u.floor ?? '-'}
                    </p>
                    {u.surface != null && <p className="text-[11px] text-immo-text-muted">{u.surface} m²</p>}
                    <p className="mt-1 text-xs font-semibold text-immo-text-primary">
                      {u.price != null ? formatPrice(u.price) : '-'}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {u.delivery_date && (
                        <span className="text-[10px] text-immo-text-muted">{format(new Date(u.delivery_date), 'MM/yyyy')}</span>
                      )}
                      {isClose && (
                        <span className="rounded bg-immo-accent-green-bg px-1 py-0.5 text-[9px] font-medium text-immo-accent-green">{t('sale_modal.delivery_close')}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-immo-border-default">
              <table className="w-full">
                <thead>
                  <tr className="bg-immo-bg-card-hover">
                    <th className="w-8 px-2 py-2" />
                    {[t('sale_modal.th_code'), t('sale_modal.th_type'), t('sale_modal.th_floor'), t('sale_modal.th_surface'), t('sale_modal.th_price'), t('sale_modal.th_delivery')].map((h) => (
                      <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-immo-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-immo-border-default">
                  {filtered.map((u) => {
                    const selected = selectedUnits.includes(u.id)
                    return (
                      <tr
                        key={u.id}
                        onClick={() => onToggleUnit(u.id)}
                        className={`cursor-pointer transition-colors ${selected ? 'bg-immo-accent-green/5' : 'bg-immo-bg-card hover:bg-immo-bg-card-hover'}`}
                      >
                        <td className="px-2 py-2">
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-immo-accent-green bg-immo-accent-green' : 'border-immo-border-default'}`}>
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-immo-text-primary">{u.code}</td>
                        <td className="px-2 py-2 text-[11px] text-immo-text-muted">{UNIT_TYPE_LABELS[u.type]}{u.subtype ? ` ${u.subtype}` : ''}</td>
                        <td className="px-2 py-2 text-[11px] text-immo-text-muted">{u.floor ?? '-'}</td>
                        <td className="px-2 py-2 text-[11px] text-immo-text-muted">{u.surface ? `${u.surface}m²` : '-'}</td>
                        <td className="px-2 py-2 text-xs font-medium text-immo-text-primary">{u.price != null ? formatPriceCompact(u.price) : '-'}</td>
                        <td className="px-2 py-2 text-[11px] text-immo-text-muted">{u.delivery_date ? format(new Date(u.delivery_date), 'MM/yyyy') : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Options tab */}
      {subTab === 'options' && (
        <div className="space-y-4">
          <p className="text-xs text-immo-text-muted">{t('sale_modal.options_subtitle')}</p>

          {/* List existing amenities */}
          {amenities.length > 0 && (
            <div className="space-y-2">
              {amenities.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-2.5">
                  <div>
                    <p className="text-sm text-immo-text-primary">{a.description}</p>
                    <p className="text-xs text-immo-accent-green">{formatPrice(a.price)}</p>
                  </div>
                  <button onClick={() => onRemoveAmenity(a.id)} className="rounded-md p-1 text-immo-text-muted hover:bg-immo-status-red-bg hover:text-immo-status-red">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => setShowAddAmenity(true)}
            className="border border-dashed border-immo-border-default text-xs text-immo-text-secondary hover:border-immo-accent-green hover:text-immo-accent-green"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('sale_modal.add_amenity')}
          </Button>

          {/* Add amenity inline form */}
          {showAddAmenity && (
            <AddAmenityForm
              onAdd={(a) => { onAddAmenity(a); setShowAddAmenity(false) }}
              onCancel={() => setShowAddAmenity(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
