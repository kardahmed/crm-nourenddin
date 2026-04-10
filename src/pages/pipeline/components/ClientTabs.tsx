import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Bookmark, DollarSign, CreditCard, FileText, Receipt,
  StickyNote, ListTodo, Clock, Plus, CheckCircle, Eye,
  Bot,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StatusBadge, EmptyState, Modal } from '@/components/common'
import { formatPrice } from '@/lib/constants'
import { HISTORY_TYPE_LABELS, VISIT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types'
import type { HistoryType, VisitStatus, PaymentStatus, TaskStatus } from '@/types'
import { format, isAfter } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface ClientTabsProps {
  clientId: string
  tenantId: string
}

const TABS = [
  { key: 'visits', label: 'Visites', icon: Calendar },
  { key: 'reservation', label: 'Réservation', icon: Bookmark },
  { key: 'sale', label: 'Vente', icon: DollarSign },
  { key: 'schedule', label: 'Échéance', icon: Clock },
  { key: 'payment', label: 'Paiement', icon: CreditCard },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'charges', label: 'Charges', icon: Receipt },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'tasks', label: 'Tâches', icon: ListTodo },
  { key: 'history', label: 'Historique', icon: Clock },
] as const

type TabKey = (typeof TABS)[number]['key']

const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'

export function ClientTabs({ clientId, tenantId }: ClientTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('visits')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-immo-border-default">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs transition-colors ${
              activeTab === key
                ? 'border-immo-accent-green font-medium text-immo-accent-green'
                : 'border-transparent text-immo-text-muted hover:text-immo-text-secondary'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-5">
        {activeTab === 'visits' && <VisitsTab clientId={clientId} tenantId={tenantId} />}
        {activeTab === 'reservation' && <ReservationTab clientId={clientId} />}
        {activeTab === 'sale' && <SaleTab clientId={clientId} />}
        {activeTab === 'schedule' && <ScheduleTab clientId={clientId} />}
        {activeTab === 'payment' && <PaymentTab clientId={clientId} />}
        {activeTab === 'documents' && <DocumentsTab clientId={clientId} />}
        {activeTab === 'charges' && <ChargesTab clientId={clientId} tenantId={tenantId} />}
        {activeTab === 'notes' && <NotesTab clientId={clientId} />}
        {activeTab === 'tasks' && <TasksTab clientId={clientId} tenantId={tenantId} />}
        {activeTab === 'history' && <HistoryTab clientId={clientId} />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  VISITS TAB                                 */
/* ═══════════════════════════════════════════ */

function VisitsTab({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const [showCreate, setShowCreate] = useState(false)
  const userId = useAuthStore((s) => s.session?.user?.id)
  const qc = useQueryClient()

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['client-visits', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('*, users!visits_agent_id_fkey(first_name, last_name)')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const createVisit = useMutation({
    mutationFn: async (input: { scheduled_at: string; visit_type: string; notes: string }) => {
      const { error } = await supabase.from('visits').insert({
        tenant_id: tenantId,
        client_id: clientId,
        agent_id: userId!,
        scheduled_at: input.scheduled_at,
        visit_type: input.visit_type,
        notes: input.notes || null,
      } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-visits', clientId] })
      toast.success('Visite planifiée')
      setShowCreate(false)
    },
  })

  const now = new Date()
  const upcoming = visits.filter((v) => isAfter(new Date(v.scheduled_at as string), now))
  const past = visits.filter((v) => !isAfter(new Date(v.scheduled_at as string), now))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-immo-text-secondary">
          {upcoming.length} à venir, {past.length} passée(s)
        </p>
        <Button onClick={() => setShowCreate(true)} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
          <Plus className="mr-1 h-3.5 w-3.5" /> Planifier une visite
        </Button>
      </div>

      {visits.length === 0 && !isLoading ? (
        <EmptyState icon={<Calendar className="h-10 w-10" />} title="Aucune visite" description="Planifiez une première visite pour ce client" />
      ) : (
        <>
          {upcoming.length > 0 && <VisitList title="À venir" visits={upcoming} />}
          {past.length > 0 && <VisitList title="Passées" visits={past} />}
        </>
      )}

      {/* Create modal */}
      <CreateVisitModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={(d) => createVisit.mutate(d)} loading={createVisit.isPending} />
    </div>
  )
}

function VisitList({ title, visits }: { title: string; visits: Array<Record<string, unknown>> }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-immo-text-muted uppercase">{title}</h4>
      <div className="space-y-2">
        {visits.map((v) => {
          const st = VISIT_STATUS_LABELS[(v.status as VisitStatus)] ?? { label: v.status as string, color: '#7F96B7' }
          const agent = v.users as { first_name: string; last_name: string } | null
          return (
            <div key={v.id as string} className="flex items-center gap-4 rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-immo-text-primary">
                  {format(new Date(v.scheduled_at as string), 'dd/MM/yyyy HH:mm')}
                </p>
                <p className="text-[11px] text-immo-text-muted">
                  {v.visit_type as string} {agent ? `· ${agent.first_name} ${agent.last_name}` : ''}
                </p>
              </div>
              <StatusBadge label={st.label} type={st.color === '#00D4A0' ? 'green' : st.color === '#FF4949' ? 'red' : st.color === '#FF9A1E' ? 'orange' : 'muted'} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreateVisitModal({ isOpen, onClose, onSubmit, loading }: {
  isOpen: boolean; onClose: () => void; onSubmit: (d: { scheduled_at: string; visit_type: string; notes: string }) => void; loading: boolean
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [type, setType] = useState('on_site')
  const [notes, setNotes] = useState('')

  function handle() {
    if (!date) return
    onSubmit({ scheduled_at: `${date}T${time}:00`, visit_type: type, notes })
    setDate(''); setTime('10:00'); setNotes('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planifier une visite" size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-immo-text-secondary">Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></div>
          <div><Label className="text-xs text-immo-text-secondary">Heure</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} /></div>
        </div>
        <div>
          <Label className="text-xs text-immo-text-secondary">Type</Label>
          <Select value={type} onValueChange={(v) => { if (v) setType(v) }}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent className="border-immo-border-default bg-immo-bg-card">
              <SelectItem value="on_site" className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">Sur site</SelectItem>
              <SelectItem value="office" className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">Au bureau</SelectItem>
              <SelectItem value="virtual" className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">Virtuelle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-immo-text-secondary">Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className={inputClass} /></div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-immo-text-secondary">Annuler</Button>
          <Button onClick={handle} disabled={!date || loading} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" /> : 'Planifier'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════ */
/*  HISTORY TAB                                */
/* ═══════════════════════════════════════════ */

function HistoryTab({ clientId }: { clientId: string }) {
  const [filter, setFilter] = useState<string>('all')
  const [limit, setLimit] = useState(20)
  const userId = useAuthStore((s) => s.session?.user?.id)
  const qc = useQueryClient()
  const tenantId = useAuthStore((s) => s.tenantId)
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addType, setAddType] = useState<string>('note')

  const { data: entries = [] } = useQuery({
    queryKey: ['client-history', clientId, filter, limit],
    queryFn: async () => {
      let q = supabase
        .from('history')
        .select('*, users!history_agent_id_fkey(first_name, last_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (filter !== 'all') q = q.eq('type', filter as HistoryType)
      const { data, error } = await q
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('history').insert({
        tenant_id: tenantId,
        client_id: clientId,
        agent_id: userId,
        type: addType,
        title: addTitle,
      } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-history', clientId] })
      setShowAdd(false); setAddTitle('')
      toast.success('Entrée ajoutée')
    },
  })

  const FILTERS = [
    { key: 'all', label: 'Tous' },
    { key: 'call', label: 'Appels' },
    { key: 'whatsapp_message', label: 'WhatsApp' },
    { key: 'email', label: 'Emails' },
    { key: 'stage_change', label: 'Étapes' },
    { key: 'visit_planned', label: 'Visites' },
    { key: 'sale', label: 'Ventes' },
    { key: 'payment', label: 'Paiements' },
  ]

  // Group by date
  const grouped = useMemo(() => {
    const groups = new Map<string, Array<Record<string, unknown>>>()
    for (const e of entries) {
      const day = format(new Date(e.created_at as string), 'yyyy-MM-dd')
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(e)
    }
    return groups
  }, [entries])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-immo-bg-card-hover px-2 py-0.5 text-[11px] font-semibold text-immo-text-muted">{entries.length}</span>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="ghost" className="border border-immo-border-default text-xs text-immo-text-secondary hover:bg-immo-bg-card-hover">
          <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] transition-colors ${
              filter === f.key ? 'bg-immo-accent-green/10 font-medium text-immo-accent-green' : 'text-immo-text-muted hover:bg-immo-bg-card-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {entries.length === 0 ? (
        <EmptyState icon={<Clock className="h-10 w-10" />} title="Aucune activité" description="L'historique apparaîtra ici automatiquement" />
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-[11px] font-semibold text-immo-text-muted">
                {format(new Date(day), 'EEEE d MMMM yyyy', { locale: frLocale })}
              </p>
              <div className="space-y-1.5">
                {items.map((e) => {
                  const meta = HISTORY_TYPE_LABELS[(e.type as HistoryType)]
                  const agent = e.users as { first_name: string; last_name: string } | null
                  return (
                    <div key={e.id as string} className="flex items-center gap-3 rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-2.5">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-immo-accent-green" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-immo-text-primary">{meta?.label ?? (e.title as string)}</span>
                        {agent && <span className="ml-2 text-[11px] text-immo-text-muted">par {agent.first_name}</span>}
                      </div>
                      <span className="shrink-0 text-[11px] text-immo-text-muted">
                        {format(new Date(e.created_at as string), 'HH:mm')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {entries.length >= limit && (
            <button onClick={() => setLimit((l) => l + 20)} className="w-full rounded-lg border border-immo-border-default py-2 text-xs text-immo-text-muted hover:bg-immo-bg-card-hover">
              Charger plus...
            </button>
          )}
        </div>
      )}

      {/* Add manual entry */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Ajouter une entrée" size="sm">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-immo-text-secondary">Type</Label>
            <Select value={addType} onValueChange={(v) => { if (v) setAddType(v) }}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="border-immo-border-default bg-immo-bg-card">
                {['note', 'call', 'sms', 'email', 'whatsapp_message'].map((t) => (
                  <SelectItem key={t} value={t} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">
                    {HISTORY_TYPE_LABELS[t as HistoryType]?.label ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-immo-text-secondary">Titre *</Label>
            <Input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="Description..." className={inputClass} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-immo-text-secondary">Annuler</Button>
            <Button onClick={() => addEntry.mutate()} disabled={!addTitle || addEntry.isPending} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  CHARGES TAB                                */
/* ═══════════════════════════════════════════ */

function ChargesTab({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data: charges = [] } = useQuery({
    queryKey: ['client-charges', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charges')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const createCharge = useMutation({
    mutationFn: async (input: { label: string; type: string; amount: number; charge_date: string; status: string }) => {
      const { error } = await supabase.from('charges').insert({
        tenant_id: tenantId,
        client_id: clientId,
        ...input,
      } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-charges', clientId] })
      toast.success('Charge ajoutée')
      setShowCreate(false)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
          <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une charge
        </Button>
      </div>

      {charges.length === 0 ? (
        <EmptyState icon={<Receipt className="h-10 w-10" />} title="Aucune charge" description="Les frais annexes apparaîtront ici" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-immo-border-default">
          <table className="w-full">
            <thead><tr className="bg-immo-bg-card-hover">
              {['Libellé', 'Type', 'Montant', 'Date', 'Statut'].map(h => (
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
  const [label, setLabel] = useState('')
  const [type, setType] = useState('autre')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('pending')

  function handle() {
    if (!label || !amount) return
    onSubmit({ label, type, amount: Number(amount), charge_date: date, status })
    setLabel(''); setAmount(''); setDate('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une charge" size="sm">
      <div className="space-y-3">
        <div><Label className="text-xs text-immo-text-secondary">Libellé *</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Frais de notaire" className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-immo-text-secondary">Type</Label>
            <Select value={type} onValueChange={(v) => { if (v) setType(v) }}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="border-immo-border-default bg-immo-bg-card">
                {['notaire', 'agence', 'promotion', 'enregistrement', 'autre'].map(t => (
                  <SelectItem key={t} value={t} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-immo-text-secondary">Montant (DA) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-immo-text-secondary">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></div>
          <div>
            <Label className="text-xs text-immo-text-secondary">Statut</Label>
            <Select value={status} onValueChange={(v) => { if (v) setStatus(v) }}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="border-immo-border-default bg-immo-bg-card">
                <SelectItem value="pending" className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">En attente</SelectItem>
                <SelectItem value="paid" className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">Payé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-immo-text-secondary">Annuler</Button>
          <Button onClick={handle} disabled={!label || !amount || loading} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">Ajouter</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ═══════════════════════════════════════════ */
/*  NOTES TAB                                  */
/* ═══════════════════════════════════════════ */

function NotesTab({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = { current: null as ReturnType<typeof setTimeout> | null }

  const { data: client } = useQuery({
    queryKey: ['client-notes', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('notes').eq('id', clientId).single()
      if (error) { handleSupabaseError(error); throw error }
      return data as { notes: string | null }
    },
  })

  // Init from DB
  if (notes === null && client?.notes != null) {
    setNotes(client.notes)
  }

  const handleChange = useCallback((value: string) => {
    setNotes(value)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      const { error } = await supabase.from('clients').update({ notes: value } as never).eq('id', clientId)
      if (error) handleSupabaseError(error)
      setSaving(false)
    }, 1000)
  }, [clientId])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-immo-text-muted">Auto-sauvegarde activée</p>
        {saving && <span className="text-[11px] text-immo-status-orange">Enregistrement...</span>}
      </div>
      <textarea
        value={notes ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Ajoutez des notes sur ce client..."
        rows={10}
        className="w-full resize-none rounded-xl border border-immo-border-default bg-immo-bg-primary p-4 text-sm text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:outline-none focus:ring-1 focus:ring-immo-accent-green"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  TASKS TAB                                  */
/* ═══════════════════════════════════════════ */

function TasksTab({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const userId = useAuthStore((s) => s.session?.user?.id)
  const qc = useQueryClient()

  const { data: tasks = [] } = useQuery({
    queryKey: ['client-tasks', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').insert({
        tenant_id: tenantId, client_id: clientId, agent_id: userId,
        title, type: 'manual', due_at: dueAt || null,
      } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-tasks', clientId] })
      setShowCreate(false); setTitle(''); setDueAt('')
      toast.success('Tâche créée')
    },
  })

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from('tasks').update({ status } as never).eq('id', id)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }),
  })

  const STATUSES: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'En attente', color: 'text-immo-status-orange' },
    { value: 'done', label: 'Fait', color: 'text-immo-accent-green' },
    { value: 'ignored', label: 'Ignoré', color: 'text-immo-text-muted' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
          <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une tâche
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={<ListTodo className="h-10 w-10" />} title="Aucune tâche" description="Les tâches manuelles et IA apparaîtront ici" />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const st = STATUSES.find(s => s.value === t.status) ?? STATUSES[0]
            const nextStatus: TaskStatus = t.status === 'pending' ? 'done' : t.status === 'done' ? 'ignored' : 'pending'
            return (
              <div key={t.id as string} className="flex items-center gap-3 rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-3">
                <button
                  onClick={() => toggleStatus.mutate({ id: t.id as string, status: nextStatus })}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
                    t.status === 'done' ? 'border-immo-accent-green bg-immo-accent-green' : t.status === 'ignored' ? 'border-immo-text-muted bg-immo-text-muted/20' : 'border-immo-border-default hover:border-immo-accent-green'
                  }`}
                >
                  {t.status === 'done' && <CheckCircle className="h-full w-full text-immo-bg-primary" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${t.status === 'done' ? 'text-immo-text-muted line-through' : 'text-immo-text-primary'}`}>
                    {t.title as string}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-immo-text-muted">
                    {t.type === 'ai_generated' && <span className="flex items-center gap-0.5 text-purple-400"><Bot className="h-3 w-3" /> IA</span>}
                    {typeof t.due_at === 'string' && <span>{format(new Date(t.due_at), 'dd/MM/yyyy')}</span>}
                  </div>
                </div>
                <span className={`text-[11px] font-medium ${st.color}`}>{st.label}</span>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle tâche" size="sm">
        <div className="space-y-3">
          <div><Label className="text-xs text-immo-text-secondary">Titre *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rappeler le client..." className={inputClass} /></div>
          <div><Label className="text-xs text-immo-text-secondary">Échéance</Label><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-immo-text-secondary">Annuler</Button>
            <Button onClick={() => createTask.mutate()} disabled={!title || createTask.isPending} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  PLACEHOLDER TABS                           */
/* ═══════════════════════════════════════════ */

function ReservationTab({ clientId }: { clientId: string }) {
  const { data: reservations = [] } = useQuery({
    queryKey: ['client-reservations', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('reservations').select('*, projects(name), units(code)').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  if (reservations.length === 0) {
    return <EmptyState icon={<Bookmark className="h-10 w-10" />} title="Aucune réservation" description="Les réservations de ce client apparaîtront ici" />
  }

  return (
    <div className="space-y-2">
      {reservations.map((r) => (
        <div key={r.id as string} className="rounded-lg border border-immo-border-default bg-immo-bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-immo-text-primary">
                {(r.units as { code: string })?.code} — {(r.projects as { name: string })?.name}
              </p>
              <p className="text-xs text-immo-text-muted">
                Expire le {format(new Date(r.expires_at as string), 'dd/MM/yyyy')} · Acompte : {formatPrice((r.deposit_amount as number) ?? 0)}
              </p>
            </div>
            <StatusBadge label={r.status as string} type={r.status === 'active' ? 'green' : r.status === 'converted' ? 'blue' : 'red'} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SaleTab({ clientId }: { clientId: string }) {
  const { data: sales = [] } = useQuery({
    queryKey: ['client-sales', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales').select('*, projects(name), units(code)').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  if (sales.length === 0) return <EmptyState icon={<DollarSign className="h-10 w-10" />} title="Aucune vente" description="Les ventes de ce client apparaîtront ici" />

  return (
    <div className="space-y-2">
      {sales.map((s) => (
        <div key={s.id as string} className="rounded-lg border border-immo-border-default bg-immo-bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-immo-text-primary">{(s.units as { code: string })?.code} — {(s.projects as { name: string })?.name}</p>
              <p className="text-xs text-immo-text-muted">Prix final : {formatPrice(s.final_price as number)} · {s.financing_mode as string}</p>
            </div>
            <StatusBadge label={s.status === 'active' ? 'Active' : 'Annulée'} type={s.status === 'active' ? 'green' : 'red'} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ScheduleTab({ clientId }: { clientId: string }) {
  const { data: schedules = [] } = useQuery({
    queryKey: ['client-schedules', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_schedules').select('*, sales(units(code))').eq('tenant_id', (await supabase.from('clients').select('tenant_id').eq('id', clientId).single()).data?.tenant_id ?? '').order('due_date')
      if (error) return []
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  if (schedules.length === 0) return <EmptyState icon={<Clock className="h-10 w-10" />} title="Aucun échéancier" description="Les échéances de paiement apparaîtront ici" />

  return (
    <div className="overflow-hidden rounded-xl border border-immo-border-default">
      <table className="w-full">
        <thead><tr className="bg-immo-bg-card-hover">
          {['#', 'Échéance', 'Montant', 'Statut'].map(h => (
            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-immo-border-default">
          {schedules.map((s) => {
            const pst = PAYMENT_STATUS_LABELS[s.status as PaymentStatus] ?? { label: s.status as string, color: '#7F96B7' }
            return (
              <tr key={s.id as string} className="bg-immo-bg-card">
                <td className="px-4 py-3 text-sm text-immo-text-muted">{s.installment_number as number}</td>
                <td className="px-4 py-3 text-sm text-immo-text-primary">{format(new Date(s.due_date as string), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3 text-sm font-medium text-immo-text-primary">{formatPrice(s.amount as number)}</td>
                <td className="px-4 py-3"><StatusBadge label={pst.label} type={pst.color === '#00D4A0' ? 'green' : pst.color === '#FF4949' ? 'red' : 'orange'} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PaymentTab({ clientId: _clientId }: { clientId: string }) {
  return <EmptyState icon={<CreditCard className="h-10 w-10" />} title="Aucun paiement" description="Les paiements enregistrés apparaîtront ici" />
}

function DocumentsTab({ clientId }: { clientId: string }) {
  const { data: docs = [] } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Array<Record<string, unknown>>
    },
  })

  if (docs.length === 0) return <EmptyState icon={<FileText className="h-10 w-10" />} title="Aucun document" description="Les documents générés et uploadés apparaîtront ici" />

  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <a
          key={d.id as string}
          href={d.url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-immo-border-default bg-immo-bg-card px-4 py-3 hover:border-immo-border-glow/30"
        >
          <FileText className="h-5 w-5 text-immo-accent-blue" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-immo-text-primary">{d.name as string}</p>
            <p className="text-[11px] text-immo-text-muted">{d.type as string} · {format(new Date(d.created_at as string), 'dd/MM/yyyy')}</p>
          </div>
          <Eye className="h-4 w-4 text-immo-text-muted" />
        </a>
      ))}
    </div>
  )
}
