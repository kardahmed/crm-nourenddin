import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Building2, GitBranch, Bookmark, FileText, Bell, Globe, Shield,
  Save, RotateCcw, Eye, Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { LoadingSpinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { WILAYAS } from '@/lib/constants'
import { PIPELINE_STAGES } from '@/types'
import { PIPELINE_ORDER } from '@/lib/constants'
import toast from 'react-hot-toast'

type Section = 'company' | 'pipeline' | 'reservations' | 'templates' | 'notifications' | 'language' | 'security'

const SECTIONS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'company', label: 'Informations entreprise', icon: Building2 },
  { key: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { key: 'reservations', label: 'Réservations', icon: Bookmark },
  { key: 'templates', label: 'Templates documents', icon: FileText },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'language', label: 'Langue', icon: Globe },
  { key: 'security', label: 'Compte & Sécurité', icon: Shield },
]

const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'
const labelClass = 'text-[11px] font-medium text-immo-text-muted'

export function SettingsPage() {
  const [section, setSection] = useState<Section>('company')

  return (
    <div className="flex gap-6">
      {/* Side menu */}
      <div className="w-[220px] shrink-0 space-y-1">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              section === key
                ? 'bg-immo-accent-green/10 font-medium text-immo-accent-green'
                : 'text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {section === 'company' && <CompanySection />}
        {section === 'pipeline' && <PipelineSection />}
        {section === 'reservations' && <ReservationsSection />}
        {section === 'templates' && <TemplatesSection />}
        {section === 'notifications' && <NotificationsSection />}
        {section === 'language' && <LanguageSection />}
        {section === 'security' && <SecuritySection />}
      </div>
    </div>
  )
}

/* ═══ Section 1: Company ═══ */

function CompanySection() {
  const { tenantId } = useAuthStore()
  const qc = useQueryClient()

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId!).single()
      if (error) { handleSupabaseError(error); throw error }
      return data as Record<string, unknown>
    },
    enabled: !!tenantId,
  })

  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (tenant) {
      setForm({
        name: (tenant.name as string) ?? '',
        phone: (tenant.phone as string) ?? '',
        email: (tenant.email as string) ?? '',
        address: (tenant.address as string) ?? '',
        website: (tenant.website as string) ?? '',
        wilaya: (tenant.wilaya as string) ?? '',
      })
    }
  }, [tenant])

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').update(form as never).eq('id', tenantId!)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant'] }); toast.success('Informations enregistrées') },
  })

  if (isLoading) return <LoadingSpinner className="h-40" />

  return (
    <div className="space-y-5">
      <SectionHeader title="Informations entreprise" subtitle="Les informations de votre agence" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de l'agence *"><Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} /></Field>
        <Field label="Téléphone"><Input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></Field>
        <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
        <Field label="Site web"><Input value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} /></Field>
        <Field label="Adresse"><Input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} /></Field>
        <Field label="Wilaya">
          <select value={form.wilaya ?? ''} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
            <option value="">Sélectionner</option>
            {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}

/* ═══ Section 2: Pipeline ═══ */

function PipelineSection() {
  const { tenantId } = useAuthStore()
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId!).single()
      return data as Record<string, unknown> | null
    },
    enabled: !!tenantId,
  })

  const [urgentDays, setUrgentDays] = useState('7')
  const [relaunchDays, setRelaunchDays] = useState('3')

  useEffect(() => {
    if (settings) {
      setUrgentDays(String(settings.urgent_alert_days ?? 7))
      setRelaunchDays(String(settings.relaunch_alert_days ?? 3))
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      if (settings) {
        await supabase.from('tenant_settings').update({ urgent_alert_days: Number(urgentDays), relaunch_alert_days: Number(relaunchDays) } as never).eq('tenant_id', tenantId!)
      } else {
        await supabase.from('tenant_settings').insert({ tenant_id: tenantId, urgent_alert_days: Number(urgentDays), relaunch_alert_days: Number(relaunchDays) } as never)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); toast.success('Paramètres pipeline enregistrés') },
  })

  return (
    <div className="space-y-5">
      <SectionHeader title="Pipeline" subtitle="Configuration des alertes et étapes du pipeline" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Délai alerte Urgent (jours)"><Input type="number" value={urgentDays} onChange={e => setUrgentDays(e.target.value)} className={inputClass} /></Field>
        <Field label="Délai alerte À relancer (jours)"><Input type="number" value={relaunchDays} onChange={e => setRelaunchDays(e.target.value)} className={inputClass} /></Field>
      </div>
      <Separator className="bg-immo-border-default" />
      <h4 className="text-xs font-semibold text-immo-text-primary">Étapes du pipeline</h4>
      <div className="space-y-2">
        {PIPELINE_ORDER.map((stage, i) => {
          const meta = PIPELINE_STAGES[stage]
          return (
            <div key={stage} className="flex items-center gap-3 rounded-lg border border-immo-border-default bg-immo-bg-primary px-3 py-2">
              <span className="text-xs text-immo-text-muted">{i + 1}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: meta.color }} />
              <span className="flex-1 text-sm text-immo-text-primary">{meta.label}</span>
              <input type="color" defaultValue={meta.color} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent" />
            </div>
          )
        })}
      </div>
      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}

/* ═══ Section 3: Reservations ═══ */

function ReservationsSection() {
  const { tenantId } = useAuthStore()
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId!).single()
      return data as Record<string, unknown> | null
    },
    enabled: !!tenantId,
  })

  const [duration, setDuration] = useState('30')
  const [minDeposit, setMinDeposit] = useState('0')

  useEffect(() => {
    if (settings) {
      setDuration(String(settings.reservation_duration_days ?? 30))
      setMinDeposit(String(settings.min_deposit_amount ?? 0))
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      if (settings) {
        await supabase.from('tenant_settings').update({ reservation_duration_days: Number(duration), min_deposit_amount: Number(minDeposit) } as never).eq('tenant_id', tenantId!)
      } else {
        await supabase.from('tenant_settings').insert({ tenant_id: tenantId, reservation_duration_days: Number(duration), min_deposit_amount: Number(minDeposit) } as never)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); toast.success('Paramètres réservation enregistrés') },
  })

  return (
    <div className="space-y-5">
      <SectionHeader title="Réservations" subtitle="Durée et montant minimum des réservations" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Durée réservation par défaut (jours)"><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className={inputClass} /></Field>
        <Field label="Montant minimum acompte (DA)"><Input type="number" value={minDeposit} onChange={e => setMinDeposit(e.target.value)} placeholder="0" className={inputClass} /></Field>
      </div>
      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}

/* ═══ Section 4: Templates ═══ */

function TemplatesSection() {
  const { tenantId } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'contrat_vente' | 'echeancier' | 'bon_reservation'>('contrat_vente')

  const { data: templates = [] } = useQuery({
    queryKey: ['doc-templates', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('document_templates').select('*').eq('tenant_id', tenantId!)
      return (data ?? []) as Array<{ id: string; type: string; content: string }>
    },
    enabled: !!tenantId,
  })

  const current = templates.find(t => t.type === activeTab)
  const [content, setContent] = useState('')

  useEffect(() => {
    setContent(current?.content ?? '')
  }, [current, activeTab])

  const save = useMutation({
    mutationFn: async () => {
      if (current) {
        await supabase.from('document_templates').update({ content } as never).eq('id', current.id)
      } else {
        await supabase.from('document_templates').insert({ tenant_id: tenantId, type: activeTab, content } as never)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-templates'] }); toast.success('Template enregistré') },
  })

  const VARS = ['[Nom Client]', '[Téléphone]', '[NIN]', '[Bien]', '[Code Bien]', '[Projet]', '[Prix]', '[Prix Lettres]', '[Date]', '[Agent]', '[Agence]']

  const TAB_LABELS = { contrat_vente: 'Contrat de Vente', echeancier: 'Échéancier', bon_reservation: 'Bon de Réservation' }

  return (
    <div className="space-y-5">
      <SectionHeader title="Templates documents" subtitle="Modèles pour la génération de documents" />
      <div className="flex gap-1 rounded-lg border border-immo-border-default p-0.5">
        {(Object.entries(TAB_LABELS) as [typeof activeTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${activeTab === key ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] text-immo-text-muted">Variables :</span>
        {VARS.map(v => (
          <button key={v} onClick={() => setContent(c => c + ' ' + v)} className="rounded bg-immo-accent-blue-bg px-1.5 py-0.5 text-[10px] text-immo-accent-blue hover:bg-immo-accent-blue/20">
            {v}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={15}
        placeholder="Contenu du template..."
        className={`w-full resize-none rounded-xl border p-4 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-immo-accent-green ${inputClass}`}
      />
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setContent('')} className="text-xs text-immo-text-muted hover:text-immo-status-red">
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Réinitialiser
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" className="border border-immo-border-default text-xs text-immo-text-secondary"><Eye className="mr-1 h-3.5 w-3.5" /> Aperçu</Button>
        <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
      </div>
    </div>
  )
}

/* ═══ Section 5: Notifications ═══ */

function NotificationsSection() {
  const { tenantId } = useAuthStore()
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId!).single()
      return data as Record<string, unknown> | null
    },
    enabled: !!tenantId,
  })

  const NOTIFS = [
    { key: 'notif_agent_inactive', label: 'Agent inactif depuis X jours', desc: 'Alerte quand un agent n\'a pas eu d\'activité' },
    { key: 'notif_payment_late', label: 'Paiement en retard', desc: 'Alerte quand une échéance dépasse la date' },
    { key: 'notif_reservation_expired', label: 'Réservation expirée', desc: 'Alerte quand une réservation arrive à expiration' },
    { key: 'notif_new_client', label: 'Nouveau client ajouté', desc: 'Notification à chaque nouveau client' },
    { key: 'notif_new_sale', label: 'Nouvelle vente conclue', desc: 'Notification à chaque vente finalisée' },
    { key: 'notif_goal_achieved', label: 'Objectif atteint', desc: 'Notification quand un agent atteint son objectif' },
  ]

  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (settings) {
      const t: Record<string, boolean> = {}
      NOTIFS.forEach(n => { t[n.key] = settings[n.key] !== false })
      setToggles(t)
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      if (settings) {
        await supabase.from('tenant_settings').update(toggles as never).eq('tenant_id', tenantId!)
      } else {
        await supabase.from('tenant_settings').insert({ tenant_id: tenantId, ...toggles } as never)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); toast.success('Notifications enregistrées') },
  })

  return (
    <div className="space-y-5">
      <SectionHeader title="Notifications" subtitle="Gérer les alertes et notifications automatiques" />
      <div className="space-y-3">
        {NOTIFS.map(n => (
          <div key={n.key} className="flex items-center justify-between rounded-lg border border-immo-border-default bg-immo-bg-primary px-4 py-3">
            <div>
              <p className="text-sm text-immo-text-primary">{n.label}</p>
              <p className="text-[11px] text-immo-text-muted">{n.desc}</p>
            </div>
            <button
              onClick={() => setToggles(t => ({ ...t, [n.key]: !t[n.key] }))}
              className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${toggles[n.key] ? 'bg-immo-accent-green' : 'bg-immo-border-default'}`}
            >
              <div className={`h-4 w-4 rounded-full bg-white transition-transform ${toggles[n.key] ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}

/* ═══ Section 6: Language ═══ */

function LanguageSection() {
  const { i18n } = useTranslation()
  const { tenantId } = useAuthStore()
  const current = i18n.language

  async function changeLang(lang: string) {
    i18n.changeLanguage(lang)
    if (tenantId) {
      await supabase.from('tenant_settings').update({ language: lang } as never).eq('tenant_id', tenantId)
    }
    toast.success(lang === 'fr' ? 'Langue changée en Français' : 'تم تغيير اللغة إلى العربية')
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Langue" subtitle="Choisissez la langue de l'interface" />
      <div className="flex gap-3">
        {[
          { code: 'fr', label: 'Français', flag: '🇫🇷' },
          { code: 'ar', label: 'العربية', flag: '🇩🇿' },
        ].map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLang(lang.code)}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
              current === lang.code ? 'border-immo-accent-green bg-immo-accent-green/5' : 'border-immo-border-default hover:border-immo-text-muted'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="text-left">
              <p className="text-sm font-medium text-immo-text-primary">{lang.label}</p>
              <p className="text-[11px] text-immo-text-muted">{lang.code === 'fr' ? 'Interface en français' : 'واجهة باللغة العربية'}</p>
            </div>
            {current === lang.code && <div className="ml-2 h-3 w-3 rounded-full bg-immo-accent-green" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══ Section 7: Security ═══ */

function SecuritySection() {
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPass !== confirmPass) throw new Error('Les mots de passe ne correspondent pas')
      if (newPass.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères')
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      toast.success('Mot de passe modifié')
      setOldPass(''); setNewPass(''); setConfirmPass('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-5">
      <SectionHeader title="Compte & Sécurité" subtitle="Gérer votre mot de passe et la sécurité" />
      <div className="max-w-md space-y-4">
        <Field label="Mot de passe actuel"><Input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} className={inputClass} /></Field>
        <Field label="Nouveau mot de passe"><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 8 caractères" className={inputClass} /></Field>
        <Field label="Confirmer le nouveau mot de passe">
          <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className={inputClass} />
          {confirmPass && newPass !== confirmPass && <p className="mt-1 text-[11px] text-immo-status-red">Les mots de passe ne correspondent pas</p>}
        </Field>
        <Button
          onClick={() => changePassword.mutate()}
          disabled={!newPass || !confirmPass || newPass !== confirmPass || changePassword.isPending}
          className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
        >
          <Lock className="mr-1.5 h-4 w-4" />
          {changePassword.isPending ? 'Modification...' : 'Modifier le mot de passe'}
        </Button>
      </div>
    </div>
  )
}

/* ═══ Shared Components ═══ */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-lg font-semibold text-immo-text-primary">{title}</h2>
      <p className="text-xs text-immo-text-muted">{subtitle}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className={labelClass}>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button onClick={onClick} disabled={loading} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
      {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" /> : <><Save className="mr-1.5 h-4 w-4" /> Enregistrer</>}
    </Button>
  )
}
