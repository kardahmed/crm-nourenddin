import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Sparkles, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { SOURCE_LABELS } from '@/types'
import type { ClientSource } from '@/types'
import {
  useReceptionSettings,
  useAgentLoads,
  pickAgent,
  MODE_LABELS,
  MODE_DESCRIPTIONS,
} from '@/hooks/useReceptionAssignment'
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck'

const SOURCE_OPTIONS: { value: ClientSource; label: string }[] = (
  Object.keys(SOURCE_LABELS) as ClientSource[]
).map(s => ({ value: s, label: SOURCE_LABELS[s] }))

export function NewContactForm() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.session?.user?.id)

  const { data: settings } = useReceptionSettings()
  const { data: agentLoads = [] } = useAgentLoads(settings?.maxLeadsPerDay ?? 10)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState<ClientSource>('reception')
  const [notes, setNotes] = useState('')
  const [projectInterest, setProjectInterest] = useState('')
  const [budget, setBudget] = useState('')
  const [overrideAgent, setOverrideAgent] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  // Auto-suggested agent per configured mode.
  const suggested = useMemo(() => {
    if (!settings) return null
    return pickAgent(settings.mode, agentLoads)
  }, [settings, agentLoads])

  // Default to suggested agent whenever it changes (and no manual pick yet).
  useEffect(() => {
    if (suggested && !overrideAgent) {
      // noop — effective agent derived below
    }
  }, [suggested, overrideAgent])

  const effectiveAgentId = overrideAgent ?? suggested?.id ?? null
  const isOverriding =
    overrideAgent !== null && suggested !== null && overrideAgent !== suggested.id

  const { data: duplicates = [] } = useDuplicateCheck(
    fullName,
    phone,
    fullName.length >= 3 || phone.length >= 6
  )

  const create = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !phone.trim()) {
        throw new Error('Nom et téléphone requis')
      }
      if (!effectiveAgentId && settings?.mode !== 'manual') {
        throw new Error('Aucun agent disponible (plafond atteint). Ajustez les paramètres.')
      }
      if (
        isOverriding &&
        settings?.overrideRequiresReason &&
        overrideReason.trim().length < 3
      ) {
        throw new Error('Un motif est obligatoire quand vous changez l\'agent suggéré.')
      }

      const payload: Record<string, unknown> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        source,
        pipeline_stage: 'accueil',
        agent_id: effectiveAgentId,
        notes: notes.trim() || null,
        interested_projects: projectInterest.trim() ? [projectInterest.trim()] : null,
        confirmed_budget: budget ? Number(budget) : null,
      }

      const { data, error } = await supabase
        .from('clients')
        .insert(payload as never)
        .select('id, full_name, agent_id')
        .single()
      if (error) { handleSupabaseError(error); throw error }

      // Log the override reason in history so admins can audit why the
      // receptionist bypassed the suggested agent. `reassignment` fits
      // semantically — the suggested pick was "reassigned" at creation.
      if (isOverriding && data) {
        await supabase.from('history').insert({
          client_id: data.id,
          agent_id: data.agent_id,
          type: 'reassignment',
          title: `Attribution manuelle (motif: ${overrideReason.trim()})`,
          description: `Réception a bypassé l'agent suggéré par le mode ${MODE_LABELS[settings!.mode]}.`,
          metadata: {
            reassigned_by: userId,
            suggested_agent_id: suggested?.id ?? null,
            chosen_agent_id: data.agent_id,
            mode: settings?.mode,
            reason: overrideReason.trim(),
          },
        } as never)
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reception-metrics'] })
      qc.invalidateQueries({ queryKey: ['reception-agent-loads'] })
      qc.invalidateQueries({ queryKey: ['unassigned-queue'] })
      toast.success('Client créé et assigné')
      setFullName('')
      setPhone('')
      setSource('reception')
      setNotes('')
      setProjectInterest('')
      setBudget('')
      setOverrideAgent(null)
      setOverrideReason('')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    },
  })

  const blockingDuplicate = duplicates.find(d => d.match_reason === 'exact_phone')

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* ── Form ── */}
      <div className="lg:col-span-2 space-y-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
        <h2 className="text-sm font-semibold text-immo-text-primary">Nouveau contact</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-immo-text-muted">Nom complet *</span>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Mohamed Benali"
              className="h-9 rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary focus:border-immo-accent-green focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-immo-text-muted">Téléphone *</span>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0550 12 34 56"
              className="h-9 rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary focus:border-immo-accent-green focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-immo-text-muted">Source</span>
            <select
              value={source}
              onChange={e => setSource(e.target.value as ClientSource)}
              className="h-9 rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary"
            >
              {SOURCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-immo-text-muted">Projet d'intérêt</span>
            <input
              value={projectInterest}
              onChange={e => setProjectInterest(e.target.value)}
              placeholder="Nom du projet / zone"
              className="h-9 rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[11px] font-medium text-immo-text-muted">Budget approximatif (DA)</span>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="30000000"
              className="h-9 rounded-md border border-immo-border-default bg-immo-bg-primary px-3 text-sm text-immo-text-primary"
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[11px] font-medium text-immo-text-muted">Notes pour l'agent</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Contexte, demandes spécifiques, préférences horaires..."
              className="rounded-md border border-immo-border-default bg-immo-bg-primary p-3 text-sm text-immo-text-primary"
            />
          </label>
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !!blockingDuplicate}
          className="w-full rounded-lg bg-immo-accent-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-immo-accent-green/90 disabled:cursor-not-allowed disabled:bg-immo-border-default"
        >
          {create.isPending ? 'Création...' : 'Créer et assigner'}
        </button>

        {blockingDuplicate && (
          <div className="flex items-start gap-2 rounded-lg border border-immo-status-red/30 bg-immo-status-red/5 p-3 text-xs text-immo-status-red">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Ce numéro existe déjà</div>
              <div className="mt-0.5 text-[11px]">
                {blockingDuplicate.full_name} — suivi par {blockingDuplicate.agent_name ?? 'aucun agent'} (stage: {blockingDuplicate.pipeline_stage}). Transférez l'appel au lieu de créer un doublon.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Assignment panel ── */}
      <div className="space-y-3">
        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-immo-text-muted">
            <Sparkles className="h-3 w-3" /> Agent suggéré
          </div>
          {suggested ? (
            <>
              <div className="mt-1.5 text-base font-bold text-immo-accent-green">
                {suggested.first_name} {suggested.last_name}
              </div>
              <div className="mt-0.5 text-[10px] text-immo-text-muted">
                {suggested.active_clients} clients actifs · {suggested.leads_today} leads aujourd'hui
              </div>
            </>
          ) : (
            <div className="mt-1.5 text-sm text-immo-text-muted">
              {settings?.mode === 'manual' ? 'Mode manuel : choisissez ci-dessous' : 'Tous les agents ont atteint le plafond'}
            </div>
          )}
          {settings && (
            <p className="mt-2 border-t border-immo-border-default pt-2 text-[10px] text-immo-text-muted">
              {MODE_DESCRIPTIONS[settings.mode]}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
          <div className="mb-2 text-[11px] font-medium text-immo-text-muted">
            Choisir un autre agent
          </div>
          <select
            value={overrideAgent ?? suggested?.id ?? ''}
            onChange={e => setOverrideAgent(e.target.value || null)}
            className="h-9 w-full rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-sm text-immo-text-primary"
          >
            {!suggested && <option value="">— Aucune suggestion —</option>}
            {agentLoads.map(a => (
              <option key={a.id} value={a.id} disabled={a.at_cap}>
                {a.first_name} {a.last_name} ({a.active_clients} clients, {a.leads_today} aujourd'hui)
                {a.at_cap ? ' — plafond atteint' : ''}
              </option>
            ))}
          </select>

          {isOverriding && (
            <>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-immo-status-orange">
                <UserCheck className="h-3 w-3" /> Vous bypassez l'agent suggéré
              </div>
              <input
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Motif (ex: client demande cet agent)"
                className="mt-2 h-8 w-full rounded-md border border-immo-status-orange/50 bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
              />
              {settings?.overrideRequiresReason && (
                <p className="mt-1 text-[9px] text-immo-text-muted">
                  Le motif est tracé dans l'historique pour audit admin.
                </p>
              )}
            </>
          )}
        </div>

        {/* Fuzzy duplicate warnings (non-blocking) */}
        {duplicates.filter(d => d.match_reason !== 'exact_phone').length > 0 && (
          <div className="rounded-xl border border-immo-status-orange/30 bg-immo-status-orange/5 p-3">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-immo-status-orange">
              <AlertTriangle className="h-3 w-3" /> Correspondances possibles
            </div>
            <div className="space-y-1.5">
              {duplicates.filter(d => d.match_reason !== 'exact_phone').map(d => (
                <div key={d.id} className="flex items-start gap-2 text-[11px]">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-immo-text-muted" />
                  <div>
                    <span className="font-medium text-immo-text-primary">{d.full_name}</span>
                    <span className="text-immo-text-muted"> — {d.phone} ({Math.round(d.match_score)}%)</span>
                    {d.agent_name && <div className="text-[10px] text-immo-text-muted">Suivi par {d.agent_name}</div>}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-immo-text-muted">
              Ces fiches ressemblent à votre saisie. Vérifiez avant de créer.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
