import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Shuffle, Scale, CalendarDays, Hand, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SectionHeader, Field, SaveButton, inputClass, labelClass } from './shared'
import {
  MODE_LABELS,
  MODE_DESCRIPTIONS,
  type AssignmentMode,
} from '@/hooks/useReceptionAssignment'

const MODE_ICONS: Record<AssignmentMode, typeof Hand> = {
  manual: Hand,
  round_robin: Shuffle,
  load_balanced: Scale,
  leads_today: CalendarDays,
}

const MODES: AssignmentMode[] = ['manual', 'round_robin', 'load_balanced', 'leads_today']

export function ReceptionSection() {
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings' as never)
        .select('*')
        .limit(1)
        .maybeSingle()
      return data as Record<string, unknown> | null
    },
  })

  const [mode, setMode] = useState<AssignmentMode>('manual')
  const [maxLeads, setMaxLeads] = useState('10')
  const [requireReason, setRequireReason] = useState(true)

  useEffect(() => {
    if (!settings) return
    const s = settings as {
      reception_assignment_mode?: AssignmentMode
      reception_max_leads_per_day?: number
      reception_override_requires_reason?: boolean
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding form state from async query
    setMode(s.reception_assignment_mode ?? 'manual')
    setMaxLeads(String(s.reception_max_leads_per_day ?? 10))
    setRequireReason(s.reception_override_requires_reason ?? true)
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        reception_assignment_mode: mode,
        reception_max_leads_per_day: Math.max(1, Number(maxLeads) || 10),
        reception_override_requires_reason: requireReason,
      }
      if (settings) {
        const { error } = await supabase
          .from('app_settings' as never)
          .update(payload as never)
          .eq('id', (settings as { id: string }).id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('app_settings' as never)
          .insert(payload as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] })
      qc.invalidateQueries({ queryKey: ['reception-settings'] })
      toast.success('Règles de réception enregistrées')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-immo-accent-green border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Réception"
        subtitle="Règles d'attribution automatique des leads saisis par la réception."
      />

      <div>
        <label className={labelClass}>Mode d'attribution</label>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          {MODES.map(m => {
            const Icon = MODE_ICONS[m]
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? 'border-immo-accent-green bg-immo-accent-green/5'
                    : 'border-immo-border-default bg-immo-bg-primary hover:bg-immo-bg-card-hover'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                    active
                      ? 'bg-immo-accent-green/20 text-immo-accent-green'
                      : 'bg-immo-bg-card text-immo-text-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        active ? 'text-immo-accent-green' : 'text-immo-text-primary'
                      }`}
                    >
                      {MODE_LABELS[m]}
                    </span>
                    {active && (
                      <span className="rounded-full bg-immo-accent-green/10 px-1.5 py-0.5 text-[9px] font-bold text-immo-accent-green">
                        ACTIF
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-immo-text-muted">
                    {MODE_DESCRIPTIONS[m]}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Separator className="bg-immo-border-default" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Plafond quotidien par agent">
          <Input
            type="number"
            min={1}
            max={100}
            value={maxLeads}
            onChange={e => setMaxLeads(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-immo-text-muted">
            Au-delà de ce nombre de leads reçus aujourd'hui, l'agent est marqué « plafond atteint » et exclu des suggestions.
          </p>
        </Field>

        <Field label="Attribution manuelle">
          <label className="flex items-start gap-2 rounded-lg border border-immo-border-default bg-immo-bg-primary p-3">
            <input
              type="checkbox"
              checked={requireReason}
              onChange={e => setRequireReason(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-immo-accent-green"
            />
            <div>
              <div className="text-sm font-medium text-immo-text-primary">
                Motif obligatoire pour contourner la suggestion
              </div>
              <div className="text-[11px] text-immo-text-muted">
                Oblige la réception à saisir une raison quand elle choisit un agent différent de celui suggéré par le mode auto. Désactiver uniquement si le mode est 100% manuel.
              </div>
            </div>
          </label>
        </Field>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-immo-accent-blue/30 bg-immo-accent-blue/5 p-3 text-[11px] text-immo-text-muted">
        <Info className="h-4 w-4 shrink-0 text-immo-accent-blue" />
        <div>
          <strong className="text-immo-text-primary">Traçabilité:</strong>{' '}
          chaque attribution (auto ou manuelle) est loggée dans l'historique du client avec le mode utilisé, l'agent suggéré, l'agent retenu et le motif éventuel. Le tableau de bord « Équité » permet de vérifier la distribution.
        </div>
      </div>

      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}
