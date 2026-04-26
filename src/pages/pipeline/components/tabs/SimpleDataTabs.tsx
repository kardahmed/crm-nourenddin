import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bookmark, DollarSign, CreditCard, Receipt,
  Clock, Plus, Check, StickyNote, Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// native <select> used instead of base-ui Select
import { StatusBadge, EmptyState, Modal } from '@/components/common'
import { ClientDocuments } from '../ClientDocuments'
import { NewSaleModal } from '../modals/NewSaleModal'
import { CreateReservationModal } from '../modals/CreateReservationModal'
import type { PipelineStage } from '@/types'

function ClientDocumentsWrapper({ clientId }: { clientId: string }) {
  return <ClientDocuments clientId={clientId} />
}
import { formatPrice } from '@/lib/constants'
import { PAYMENT_STATUS_LABELS } from '@/types'
import type { PaymentStatus } from '@/types'

import { format, formatDistanceToNow } from 'date-fns'
import { fr as frLocale, ar as arLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { inputClass } from './shared'

/* ═══ Reservation ═══ */
export function ReservationTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [showCreate, setShowCreate] = useState(false)

  const { data: reservations = [] } = useQuery({
    queryKey: ['client-reservations', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('reservations').select('*, projects(name), units(code)').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const { data: client } = useQuery({
    queryKey: ['client-info-reservation', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, nin_cin, pipeline_stage')
        .eq('id', clientId)
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as {
        id: string; full_name: string; phone: string; nin_cin: string | null; pipeline_stage: PipelineStage
      }
    },
  })

  const canCreate = can('reservations.create')

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreate(true)}
            disabled={!client}
            className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {t('action.add')}
          </Button>
        </div>
      )}

      {reservations.length === 0 ? (
        <EmptyState icon={<Bookmark className="h-10 w-10" />} title={t('common.no_data')} />
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => (
            <div key={r.id as string} className="rounded-lg border border-immo-border-default bg-immo-bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-immo-text-primary">{(r.units as { code: string })?.code} — {(r.projects as { name: string })?.name}</p>
                  <p className="text-xs text-immo-text-muted">
                    {t('status.expired')} {format(new Date(r.expires_at as string), 'dd/MM/yyyy')} · {t('field.deposit')} : {formatPrice((r.deposit_amount as number) ?? 0)}
                  </p>
                </div>
                <StatusBadge label={r.status as string} type={r.status === 'active' ? 'green' : r.status === 'converted' ? 'blue' : 'red'} />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateReservationModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        client={client ?? null}
      />
    </div>
  )
}

/* ═══ Sale ═══ */
export function SaleTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [showCreate, setShowCreate] = useState(false)

  const { data: sales = [] } = useQuery({
    queryKey: ['client-sales', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales').select('*, projects(name), units(code)').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const { data: client } = useQuery({
    queryKey: ['client-info-sale', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, nin_cin, pipeline_stage')
        .eq('id', clientId)
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as {
        id: string; full_name: string; phone: string; nin_cin: string | null; pipeline_stage: PipelineStage
      }
    },
  })

  const canCreate = can('sales.create')

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreate(true)}
            disabled={!client}
            className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {t('action.add')}
          </Button>
        </div>
      )}

      {sales.length === 0 ? (
        <EmptyState icon={<DollarSign className="h-10 w-10" />} title={t('common.no_data')} />
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <div key={s.id as string} className="rounded-lg border border-immo-border-default bg-immo-bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-immo-text-primary">{(s.units as { code: string })?.code} — {(s.projects as { name: string })?.name}</p>
                  <p className="text-xs text-immo-text-muted">{t('field.price')} : {formatPrice(s.final_price as number)} · {s.financing_mode as string}</p>
                </div>
                <StatusBadge label={s.status === 'active' ? t('status.active') : t('status.cancelled')} type={s.status === 'active' ? 'green' : 'red'} />
              </div>
            </div>
          ))}
        </div>
      )}

      <NewSaleModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        client={client ?? null}
      />
    </div>
  )
}

/* ═══ Schedule ═══ */
export function ScheduleTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.session?.user?.id)
  const canMarkPaid = can('payments.mark_paid')

  const { data: schedules = [] } = useQuery({
    queryKey: ['client-schedules', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_schedules').select('*, sales(units(code), client_id)').order('due_date')
      // Filter by client_id in-memory (schedules linked to this client's sales)
      const filtered = (data ?? []).filter((r: Record<string, unknown>) => {
        const s = r.sales as { client_id: string } | null
        return s?.client_id === clientId
      })
      if (error) return []
      return filtered as unknown as Array<Record<string, unknown>>
    },
  })

  const markPaid = useMutation({
    mutationFn: async (s: Record<string, unknown>) => {
      const { error } = await supabase
        .from('payment_schedules')
        .update({ status: 'paid', paid_at: new Date().toISOString() } as never)
        .eq('id', s.id as string)
      if (error) { handleSupabaseError(error); throw error }
      // Log to history
      await supabase.from('history').insert({
        client_id: clientId,
        agent_id: userId,
        type: 'payment',
        title: `Echeance #${s.installment_number} marquee payee`,
        description: `Montant : ${formatPrice(s.amount as number)}`,
      } as never)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-schedules', clientId] })
      qc.invalidateQueries({ queryKey: ['client-payments', clientId] })
      qc.invalidateQueries({ queryKey: ['client-history', clientId] })
      toast.success('Paiement enregistré')
    },
  })

  if (schedules.length === 0) return <EmptyState icon={<Clock className="h-10 w-10" />} title={t('common.no_data')} />

  const headers = ['#', t('field.due_date'), t('field.amount'), t('field.status')]
  if (canMarkPaid) headers.push('')

  return (
    <div className="overflow-hidden rounded-xl border border-immo-border-default">
      <table className="w-full">
        <thead><tr className="bg-immo-bg-card-hover">
          {headers.map((h, i) => (
            <th key={`${i}-${h}`} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-immo-border-default">
          {schedules.map((s) => {
            const pst = PAYMENT_STATUS_LABELS[s.status as PaymentStatus] ?? { label: s.status as string, color: '#7F96B7' }
            const isPending = s.status !== 'paid' && s.status !== 'cancelled'
            return (
              <tr key={s.id as string} className="bg-immo-bg-card">
                <td className="px-4 py-3 text-sm text-immo-text-muted">{s.installment_number as number}</td>
                <td className="px-4 py-3 text-sm text-immo-text-primary">{format(new Date(s.due_date as string), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3 text-sm font-medium text-immo-text-primary">{formatPrice(s.amount as number)}</td>
                <td className="px-4 py-3"><StatusBadge label={pst.label} type={pst.color === '#00D4A0' ? 'green' : pst.color === '#FF4949' ? 'red' : 'orange'} /></td>
                {canMarkPaid && (
                  <td className="px-4 py-3 text-right">
                    {isPending && (
                      <Button
                        onClick={() => markPaid.mutate(s)}
                        disabled={markPaid.isPending}
                        className="h-7 bg-immo-accent-green px-2.5 text-[11px] font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
                      >
                        <Check className="mr-1 h-3 w-3" /> Marquer payé
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ═══ Payment ═══ */
export function PaymentTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.session?.user?.id)
  const canMarkPaid = can('payments.mark_paid')

  const { data: schedules = [] } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_schedules')
        .select('*, sales(units(code), client_id)')
        .order('due_date', { ascending: false })
      if (error) return []
      const filtered = (data ?? []).filter((r: Record<string, unknown>) => {
        const s = r.sales as { client_id: string } | null
        return s?.client_id === clientId
      })
      return filtered as unknown as Array<Record<string, unknown>>
    },
  })

  const markPaid = useMutation({
    mutationFn: async (s: Record<string, unknown>) => {
      const { error } = await supabase
        .from('payment_schedules')
        .update({ status: 'paid', paid_at: new Date().toISOString() } as never)
        .eq('id', s.id as string)
      if (error) { handleSupabaseError(error); throw error }
      await supabase.from('history').insert({
        client_id: clientId,
        agent_id: userId,
        type: 'payment',
        title: `Echeance #${s.installment_number} marquee payee`,
        description: `Montant : ${formatPrice(s.amount as number)}`,
      } as never)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments', clientId] })
      qc.invalidateQueries({ queryKey: ['client-schedules', clientId] })
      qc.invalidateQueries({ queryKey: ['client-history', clientId] })
      toast.success('Paiement enregistré')
    },
  })

  const paid = schedules.filter(p => p.status === 'paid')
  const pending = schedules.filter(p => p.status !== 'paid' && p.status !== 'cancelled')
  const totalPaid = paid.reduce((s, p) => s + ((p.amount as number) ?? 0), 0)
  const totalPending = pending.reduce((s, p) => s + ((p.amount as number) ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary px-4 py-2">
          <p className="text-[10px] text-immo-text-muted">{t('common.total')} payé</p>
          <p className="text-lg font-bold text-immo-accent-green">{formatPrice(totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary px-4 py-2">
          <p className="text-[10px] text-immo-text-muted">Restant à payer</p>
          <p className="text-lg font-bold text-immo-status-orange">{formatPrice(totalPending)}</p>
        </div>
      </div>

      {schedules.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-10 w-10" />} title={t('common.no_data')} />
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-immo-text-muted">À payer ({pending.length})</h4>
              <div className="space-y-2">
                {pending.map(p => (
                  <div key={p.id as string} className="flex items-center gap-3 rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-immo-status-orange/10">
                      <CreditCard className="h-4 w-4 text-immo-status-orange" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-immo-text-primary">{formatPrice(p.amount as number)}</p>
                      <p className="text-[11px] text-immo-text-muted">
                        Échéance #{p.installment_number as number} · {format(new Date(p.due_date as string), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    {canMarkPaid && (
                      <Button
                        onClick={() => markPaid.mutate(p)}
                        disabled={markPaid.isPending}
                        className="h-8 bg-immo-accent-green px-3 text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Marquer payé
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {paid.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-immo-text-muted">Payés ({paid.length})</h4>
              <div className="space-y-2">
                {paid.map(p => (
                  <div key={p.id as string} className="flex items-center gap-3 rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-immo-accent-green/10">
                      <CreditCard className="h-4 w-4 text-immo-accent-green" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-immo-text-primary">{formatPrice(p.amount as number)}</p>
                      <p className="text-[11px] text-immo-text-muted">
                        Échéance #{p.installment_number as number} · {format(new Date(p.due_date as string), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <StatusBadge label={t('status.paid')} type="green" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ═══ Documents ═══ */
export function DocumentsTab({ clientId }: { clientId: string }) {
  // Use the storage-based ClientDocuments component
  return <ClientDocumentsWrapper clientId={clientId} />
}

/* ═══ Charges ═══ */
export function ChargesTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data: charges = [] } = useQuery({
    queryKey: ['client-charges', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('charges').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const createCharge = useMutation({
    mutationFn: async (input: { label: string; type: string; amount: number; charge_date: string; status: string }) => {
      const { error } = await supabase.from('charges').insert({  client_id: clientId, ...input } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-charges', clientId] })
      toast.success(t('success.created'))
      setShowCreate(false)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
          <Plus className="mr-1 h-3.5 w-3.5" /> {t('action.add')}
        </Button>
      </div>

      {charges.length === 0 ? (
        <EmptyState icon={<Receipt className="h-10 w-10" />} title={t('common.no_data')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-immo-border-default">
          <table className="w-full">
            <thead><tr className="bg-immo-bg-card-hover">
              {[t('field.name'), t('field.type'), t('field.amount'), t('field.date'), t('field.status')].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-immo-border-default">
              {charges.map((c) => {
                const pst = PAYMENT_STATUS_LABELS[c.status as PaymentStatus] ?? { label: c.status as string, color: '#7F96B7' }
                return (
                  <tr key={c.id as string} className="bg-immo-bg-card hover:bg-immo-bg-card-hover">
                    <td className="px-4 py-3 text-sm text-immo-text-primary">{c.label as string}</td>
                    <td className="px-4 py-3 text-xs text-immo-text-muted">{c.type as string}</td>
                    <td className="px-4 py-3 text-sm font-medium text-immo-text-primary">{formatPrice(c.amount as number)}</td>
                    <td className="px-4 py-3 text-xs text-immo-text-muted">{c.charge_date ? format(new Date(c.charge_date as string), 'dd/MM/yyyy') : '-'}</td>
                    <td className="px-4 py-3"><StatusBadge label={pst.label} type={pst.color === '#00D4A0' ? 'green' : pst.color === '#FF4949' ? 'red' : 'orange'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateChargeModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={(d) => createCharge.mutate(d)} loading={createCharge.isPending} />
    </div>
  )
}

function CreateChargeModal({ isOpen, onClose, onSubmit, loading }: {
  isOpen: boolean; onClose: () => void; onSubmit: (d: { label: string; type: string; amount: number; charge_date: string; status: string }) => void; loading: boolean
}) {
  const { t } = useTranslation()
  const [label, setLabel] = useState(''); const [type, setType] = useState('autre')
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(''); const [status, setStatus] = useState('pending')

  function handle() {
    if (!label || !amount) return
    onSubmit({ label, type, amount: Number(amount), charge_date: date, status })
    setLabel(''); setAmount(''); setDate('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('action.add')} size="sm">
      <div className="space-y-3">
        <div><Label className="text-xs text-immo-text-secondary">{t('field.name')} *</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-immo-text-secondary">{t('field.type')}</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
              {['notaire', 'agence', 'promotion', 'enregistrement', 'autre'].map(tp => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </div>
          <div><Label className="text-xs text-immo-text-secondary">{t('field.amount')} *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-immo-text-secondary">{t('field.date')}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></div>
          <div>
            <Label className="text-xs text-immo-text-secondary">{t('field.status')}</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
              <option value="pending">{t('status.pending')}</option>
              <option value="paid">{t('status.paid')}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-immo-text-secondary">{t('action.cancel')}</Button>
          <Button onClick={handle} disabled={!label || !amount || loading} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">{t('action.add')}</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ═══ Notes ═══ */
export function NotesTab({ clientId }: { clientId: string }) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'ar' ? arLocale : frLocale
  const userId = useAuthStore((s) => s.session?.user?.id)
  const { isAdmin } = usePermissions()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [legacyShown, setLegacyShown] = useState(true)

  // Legacy single-text note (kept on clients.notes column)
  const { data: client } = useQuery({
    queryKey: ['client-legacy-note', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('notes').eq('id', clientId).single()
      if (error) { handleSupabaseError(error); throw error }
      return data as { notes: string | null }
    },
  })

  // Timestamped notes from history table
  const { data: notes = [] } = useQuery({
    queryKey: ['client-notes-list', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('history')
        .select('id, title, description, created_at, agent_id, users!history_agent_id_fkey(first_name, last_name)')
        .eq('client_id', clientId)
        .eq('type', 'note')
        .order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return (data ?? []) as unknown as Array<Record<string, unknown>>
    },
  })

  const createNote = useMutation({
    mutationFn: async (input: { title: string; description: string }) => {
      const { error } = await supabase.from('history').insert({
        client_id: clientId,
        agent_id: userId,
        type: 'note',
        title: input.title,
        description: input.description || null,
      } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notes-list', clientId] })
      qc.invalidateQueries({ queryKey: ['client-history', clientId] })
      toast.success('Note ajoutée')
      setShowCreate(false)
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('history').delete().eq('id', id)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notes-list', clientId] })
      qc.invalidateQueries({ queryKey: ['client-history', clientId] })
      toast.success('Note supprimée')
    },
  })

  const migrateLegacy = useMutation({
    mutationFn: async () => {
      if (!client?.notes) return
      const { error: histErr } = await supabase.from('history').insert({
        client_id: clientId,
        agent_id: userId,
        type: 'note',
        title: client.notes,
      } as never)
      if (histErr) { handleSupabaseError(histErr); throw histErr }
      const { error: clearErr } = await supabase.from('clients').update({ notes: null } as never).eq('id', clientId)
      if (clearErr) { handleSupabaseError(clearErr); throw clearErr }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notes-list', clientId] })
      qc.invalidateQueries({ queryKey: ['client-legacy-note', clientId] })
      toast.success('Note migrée')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-immo-text-muted">{notes.length} note{notes.length > 1 ? 's' : ''}</p>
        <Button onClick={() => setShowCreate(true)} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
          <Plus className="mr-1 h-3.5 w-3.5" /> Note
        </Button>
      </div>

      {legacyShown && client?.notes && (
        <div className="rounded-lg border border-immo-status-orange/30 bg-immo-status-orange/5 p-3">
          <div className="flex items-start gap-2">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-immo-status-orange" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-immo-status-orange">Note héritée (ancien format)</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-immo-text-primary">{client.notes}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => migrateLegacy.mutate()}
                  disabled={migrateLegacy.isPending}
                  className="h-7 bg-immo-accent-green px-2.5 text-[11px] font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
                >
                  Migrer en note datée
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLegacyShown(false)}
                  className="h-7 px-2.5 text-[11px] text-immo-text-secondary"
                >
                  Masquer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote className="h-10 w-10" />} title={t('common.no_data')} description="Cliquez sur + Note pour ajouter une note" />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const agent = n.users as { first_name: string; last_name: string } | null
            const isOwn = n.agent_id === userId
            return (
              <div key={n.id as string} className="rounded-lg border border-immo-border-default bg-immo-bg-card p-3">
                <p className="whitespace-pre-wrap text-sm text-immo-text-primary">{n.title as string}</p>
                {n.description ? <p className="mt-1 whitespace-pre-wrap text-xs text-immo-text-secondary">{n.description as string}</p> : null}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-immo-text-muted">
                    {agent ? `${agent.first_name} ${agent.last_name}` : '—'} · {format(new Date(n.created_at as string), 'dd/MM/yyyy HH:mm')}
                    <span className="ml-1 text-immo-text-muted/70">({formatDistanceToNow(new Date(n.created_at as string), { addSuffix: true, locale: dateLocale })})</span>
                  </p>
                  {(isAdmin || isOwn) && (
                    <button
                      onClick={() => {
                        if (window.confirm('Supprimer cette note ?')) deleteNote.mutate(n.id as string)
                      }}
                      title="Supprimer"
                      className="rounded-md p-1 text-immo-text-muted hover:bg-immo-status-red/10 hover:text-immo-status-red"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateNoteModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(d) => createNote.mutate(d)}
        loading={createNote.isPending}
      />
    </div>
  )
}

function CreateNoteModal({ isOpen, onClose, onSubmit, loading }: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (d: { title: string; description: string }) => void
  loading: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  function handle() {
    if (!title.trim()) return
    onSubmit({ title: title.trim(), description: description.trim() })
    setTitle(''); setDescription('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle note" size="sm">
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-immo-text-secondary">Note *</Label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tapez votre note..."
            rows={4}
            className={`w-full resize-none rounded-md border px-3 py-2 text-sm ${inputClass}`}
            autoFocus
          />
        </div>
        <div>
          <Label className="text-xs text-immo-text-secondary">Détails (optionnel)</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Informations complémentaires..."
            rows={3}
            className={`w-full resize-none rounded-md border px-3 py-2 text-sm ${inputClass}`}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-immo-text-secondary">Annuler</Button>
          <Button onClick={handle} disabled={!title.trim() || loading} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" /> : 'Ajouter'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

