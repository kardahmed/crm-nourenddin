import { Phone, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/common'
import { useReceptionSettings, useAgentLoads } from '@/hooks/useReceptionAssignment'

interface AgentContact {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  last_activity: string | null
}

export function AgentsDirectory() {
  const { data: settings } = useReceptionSettings()
  const { data: loads = [] } = useAgentLoads(settings?.maxLeadsPerDay ?? 10)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['reception-agents-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, email, last_activity')
        .eq('role', 'agent')
        .eq('status', 'active')
        .order('first_name')
      if (error) throw error
      return (data ?? []) as AgentContact[]
    },
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />

  // Merge contacts with load info.
  const rows = contacts.map(c => ({
    ...c,
    load: loads.find(l => l.id === c.id) ?? null,
  }))

  return (
    <div className="space-y-2">
      <p className="mb-2 text-[11px] text-immo-text-muted">
        Annuaire temps réel de l'équipe commerciale. Les compteurs sont utiles pour transférer un appel ou assigner un walk-in sans passer par la file d'attente.
      </p>

      {rows.map(a => {
        const inactiveDays = a.last_activity
          ? Math.floor((Date.now() - new Date(a.last_activity).getTime()) / 86400000)
          : 999
        const isRecent = inactiveDays <= 1

        return (
          <div
            key={a.id}
            className="flex items-center gap-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-immo-accent-green/10 text-sm font-semibold text-immo-accent-green">
              {a.first_name[0]}
              {a.last_name[0]}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-immo-text-primary">
                  {a.first_name} {a.last_name}
                </span>
                {isRecent ? (
                  <span className="flex items-center gap-1 rounded-full bg-immo-accent-green/10 px-2 py-0.5 text-[9px] font-semibold text-immo-accent-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-immo-accent-green" /> Actif
                  </span>
                ) : (
                  <span className="rounded-full bg-immo-text-muted/10 px-2 py-0.5 text-[9px] font-semibold text-immo-text-muted">
                    Inactif {inactiveDays}j
                  </span>
                )}
                {a.load?.at_cap && (
                  <span className="rounded-full bg-immo-status-red/10 px-2 py-0.5 text-[9px] font-semibold text-immo-status-red">
                    Plafond atteint
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-immo-text-muted">
                {a.phone && (
                  <a
                    href={`tel:${a.phone}`}
                    className="flex items-center gap-1 hover:text-immo-accent-blue"
                  >
                    <Phone className="h-3 w-3" /> {a.phone}
                  </a>
                )}
                {a.last_activity && (
                  <span>
                    dernière activité {formatDistanceToNow(new Date(a.last_activity), { locale: fr, addSuffix: true })}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-lg font-bold text-immo-text-primary">
                {a.load?.leads_today ?? 0}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-immo-text-muted">
                leads aujourd'hui
              </div>
              <div className="mt-0.5 text-[10px] text-immo-text-muted">
                {a.load?.active_clients ?? 0} clients actifs
              </div>
            </div>
          </div>
        )
      })}

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-immo-border-default p-10 text-center">
          <User className="mx-auto mb-3 h-8 w-8 text-immo-text-muted/50" />
          <p className="text-sm text-immo-text-muted">Aucun agent actif.</p>
        </div>
      )}
    </div>
  )
}
