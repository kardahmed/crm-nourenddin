import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useClients } from '@/hooks/useClients'
import { useAutoTasks } from '@/hooks/useAutoTasks'
import { useProjects } from '@/hooks/useProjects'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SOURCE_LABELS, UNIT_TYPE_LABELS, INTEREST_LEVEL_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/types'
import type { Client, ClientSource, InterestLevel, PaymentMethod } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  phone: z.string().min(8, 'Téléphone requis (min 8 chiffres)'),
  email: z.string().email('Email invalide').or(z.literal('')).optional(),
  nin_cin: z.string().optional(),
  client_type: z.string().optional(),
  birth_date: z.string().optional(),
  nationality: z.string().optional(),
  source: z.string().min(1, 'Source obligatoire'),
  interested_projects: z.array(z.string()).optional(),
  desired_unit_types: z.array(z.string()).optional(),
  confirmed_budget: z.string().optional(),
  interest_level: z.string().optional(),
  payment_method: z.string().optional(),
  agent_id: z.string().min(1, 'Agent obligatoire'),
  profession: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ClientFormModalProps {
  isOpen: boolean
  onClose: () => void
  client?: Client | null
}

const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'
const labelClass = 'text-[11px] font-medium text-immo-text-muted'

export function ClientFormModal({ isOpen, onClose, client }: ClientFormModalProps) {
  const { t } = useTranslation()
  const isEdit = !!client
  const { createClient, updateClient } = useClients()
  const { generateForStage } = useAutoTasks()
  const { projects } = useProjects()
  const { isAgent } = usePermissions()
  const currentUserId = useAuthStore(s => s.session?.user?.id)

  const [dupDismissed, setDupDismissed] = useState(false)

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['tenant-agents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('role', ['agent', 'admin'])
        .eq('status', 'active')
        .order('first_name')
      return (data ?? []) as Array<{ id: string; first_name: string; last_name: string }>
    },
    enabled: isOpen,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      nin_cin: '',
      client_type: 'individual',
      birth_date: '',
      nationality: 'Algérienne',
      source: '',
      interested_projects: [],
      desired_unit_types: [],
      confirmed_budget: '',
      interest_level: 'medium',
      payment_method: '',
      agent_id: '',
      profession: '',
      address: '',
      notes: '',
    },
  })

  const watchedPhone = watch('phone')
  const watchedName = watch('full_name')
  const { data: duplicates = [] } = useDuplicateCheck(
    watchedName ?? '',
    watchedPhone ?? '',
    isOpen && !isEdit,
  )

  useEffect(() => {
    if (isOpen) setDupDismissed(false)
  }, [isOpen])

  // Populate form when editing
  useEffect(() => {
    if (client && isOpen) {
      reset({
        full_name: client.full_name,
        phone: client.phone,
        email: client.email ?? '',
        nin_cin: client.nin_cin ?? '',
        client_type: client.client_type ?? 'individual',
        birth_date: client.birth_date ?? '',
        nationality: client.nationality ?? 'Algérienne',
        source: client.source,
        interested_projects: client.interested_projects ?? [],
        desired_unit_types: client.desired_unit_types ?? [],
        confirmed_budget: client.confirmed_budget != null ? String(client.confirmed_budget) : '',
        interest_level: client.interest_level ?? 'medium',
        payment_method: client.payment_method ?? '',
        agent_id: client.agent_id ?? '',
        profession: client.profession ?? '',
        address: client.address ?? '',
        notes: client.notes ?? '',
      })
    } else if (!client && isOpen) {
      reset()
      if (isAgent && currentUserId) {
        setValue('agent_id', currentUserId)
      }
    }
  }, [client, isOpen, reset, isAgent, currentUserId, setValue])

  async function onSubmit(data: FormData) {
    const payload = {
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      nin_cin: data.nin_cin || null,
      client_type: (data.client_type || 'individual') as 'individual' | 'company',
      birth_date: data.birth_date || null,
      nationality: data.nationality || 'Algérienne',
      source: data.source as ClientSource,
      interested_projects: data.interested_projects?.length ? data.interested_projects : null,
      desired_unit_types: data.desired_unit_types?.length ? data.desired_unit_types : null,
      confirmed_budget: data.confirmed_budget ? Number(data.confirmed_budget) : null,
      interest_level: (data.interest_level || 'medium') as InterestLevel,
      payment_method: data.payment_method ? (data.payment_method as PaymentMethod) : null,
      agent_id: data.agent_id,
      profession: data.profession || null,
      address: data.address || null,
      notes: data.notes || null,
    }

    if (isEdit && client) {
      await updateClient.mutateAsync({ id: client.id, ...payload })
    } else {
      const created = await createClient.mutateAsync(payload)
      if (created?.id && created.pipeline_stage) {
        generateForStage.mutate({ clientId: created.id, newStage: created.pipeline_stage })
      }
    }
    onClose()
  }

  const isPending = createClient.isPending || updateClient.isPending

  // Multi-select helpers
  const selectedProjects = watch('interested_projects') ?? []
  const selectedUnitTypes = watch('desired_unit_types') ?? []

  function toggleArrayItem(field: 'interested_projects' | 'desired_unit_types', value: string) {
    // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() intentionally used inside handler
    const current = watch(field) ?? []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    setValue(field, next)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('client_form.edit_client') : t('client_form.new_client')}
      subtitle={isEdit ? t('client_form.edit_client') : t('client_form.new_client')}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
          {/* ── Col 1: Identité ── */}
          <div className="space-y-3">
            <SectionTitle>Identité</SectionTitle>

            <Field label="Nom complet *" error={errors.full_name?.message}>
              <Input {...register('full_name')} placeholder="Ahmed Kardjadja" className={inputClass} />
            </Field>

            <Field label="Téléphone *" error={errors.phone?.message}>
              <Input {...register('phone')} placeholder="0555 123 456" className={inputClass} />
            </Field>

            <Field label="Email">
              <Input {...register('email')} type="email" placeholder="ahmed@email.com" className={inputClass} />
              {errors.email && <ErrMsg>{errors.email.message}</ErrMsg>}
            </Field>

            <Field label="NIN / CIN">
              <Input {...register('nin_cin')} placeholder={t('client_form.placeholder_nin')} className={inputClass} />
            </Field>

            <Field label="Type client">
              <Controller
                control={control}
                name="client_type"
                render={({ field }) => (
                  <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
                    <option value="">—</option>
                    <option value="individual">Particulier</option>
                    <option value="company">Entreprise</option>
                  </select>
                )}
              />
            </Field>

            <Field label="Date de naissance">
              <Input type="date" {...register('birth_date')} className={inputClass} />
            </Field>

            <Field label="Nationalité">
              <Input {...register('nationality')} placeholder={t('client_form.placeholder_nationality')} className={inputClass} />
            </Field>
          </div>

          {/* ── Col 2: Commercial ── */}
          <div className="space-y-3">
            <SectionTitle>Commercial</SectionTitle>

            <Field label="Source *" error={errors.source?.message}>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass} ${errors.source ? 'border-immo-status-red' : ''}`}>
                    <option value="">Selectionner la source</option>
                    {Object.entries(SOURCE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                )}
              />
            </Field>

            <Field label="Projets d'intérêt">
              <div className="flex flex-wrap gap-1.5">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleArrayItem('interested_projects', p.id)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                      selectedProjects.includes(p.id)
                        ? 'border-immo-accent-green/50 bg-immo-accent-green/10 text-immo-accent-green'
                        : 'border-immo-border-default text-immo-text-muted hover:border-immo-text-muted'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
                {projects.length === 0 && <span className="text-[11px] text-immo-text-muted">Aucun projet</span>}
              </div>
            </Field>

            <Field label="Types d'unités souhaitées">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(UNIT_TYPE_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleArrayItem('desired_unit_types', val)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                      selectedUnitTypes.includes(val)
                        ? 'border-immo-accent-blue/50 bg-immo-accent-blue/10 text-immo-accent-blue'
                        : 'border-immo-border-default text-immo-text-muted hover:border-immo-text-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Budget confirmé (DA)">
              <Input type="number" {...register('confirmed_budget')} placeholder="12000000" className={inputClass} />
            </Field>

            <Field label="Niveau d'intérêt">
              <Controller
                control={control}
                name="interest_level"
                render={({ field }) => (
                  <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
                    <option value="">—</option>
                    {Object.entries(INTEREST_LEVEL_LABELS).map(([val, meta]) => <option key={val} value={val}>{meta.label}</option>)}
                  </select>
                )}
              />
            </Field>

            <Field label="Modalités de paiement">
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
                    <option value="">—</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                )}
              />
            </Field>
          </div>

          {/* ── Col 3: Admin ── */}
          <div className="space-y-3">
            <SectionTitle>Assignation</SectionTitle>

            <Field label="Agent assigné *" error={errors.agent_id?.message}>
              <Controller
                control={control}
                name="agent_id"
                render={({ field }) => (
                  <select
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isAgent && !isEdit}
                    className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass} ${errors.agent_id ? 'border-immo-status-red' : ''} ${isAgent && !isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selectionner l'agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                  </select>
                )}
              />
            </Field>

            <Field label="Profession">
              <Input {...register('profession')} placeholder={t('client_form.placeholder_profession')} className={inputClass} />
            </Field>

            <Field label="Adresse">
              <Input {...register('address')} placeholder="Alger, Hydra" className={inputClass} />
            </Field>

            <Field label="Notes">
              <textarea
                {...register('notes')}
                placeholder="Notes libres sur ce client..."
                rows={4}
                className={`w-full resize-none rounded-md border p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-immo-accent-green ${inputClass}`}
              />
            </Field>
          </div>
        </div>

        {/* Duplicate warning */}
        {!isEdit && duplicates.length > 0 && !dupDismissed && (
          <div className="mt-4 rounded-lg border border-immo-status-orange/40 bg-immo-status-orange/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-immo-status-orange" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-immo-status-orange">
                  Doublon détecté — ce client existe peut-être déjà
                </p>
                <ul className="mt-1.5 space-y-1">
                  {duplicates.map((d) => (
                    <li key={d.id} className="text-[11px] text-immo-text-secondary">
                      <span className="font-medium text-immo-text-primary">{d.full_name}</span>
                      {' — '}{d.phone}
                      {d.agent_name && <span className="text-immo-text-muted"> · Agent: {d.agent_name}</span>}
                      {' · '}<span className="text-immo-text-muted">{d.pipeline_stage}</span>
                      {d.match_reason === 'exact_phone' && <span className="ml-1 rounded bg-immo-status-red/10 px-1 py-0.5 text-[10px] text-immo-status-red">Même tél.</span>}
                      {d.match_reason === 'fuzzy_phone' && <span className="ml-1 rounded bg-immo-status-orange/10 px-1 py-0.5 text-[10px] text-immo-status-orange">Tél. similaire</span>}
                      {d.match_reason === 'fuzzy_name' && <span className="ml-1 rounded bg-immo-accent-blue/10 px-1 py-0.5 text-[10px] text-immo-accent-blue">Nom similaire</span>}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setDupDismissed(true)}
                  className="mt-2 text-[11px] font-medium text-immo-text-muted underline hover:text-immo-text-primary"
                >
                  Ignorer et continuer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3 border-t border-immo-border-default pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary"
          >
            {t('action.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            {isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
            ) : isEdit ? (
              t('action.save')
            ) : (
              t('client_form.add_client')
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="border-b border-immo-border-default pb-1 text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted">{children}</p>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className={labelClass}>{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <ErrMsg>{error}</ErrMsg>}
    </div>
  )
}

function ErrMsg({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-[11px] text-immo-status-red">{children}</p>
}
