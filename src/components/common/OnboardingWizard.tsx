import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Building2, Users, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

interface OnboardingStep {
  key: string
  label: string
  icon: typeof Building2
  done: boolean
  action: () => void
}

const DISMISS_KEY = 'crm.onboarding.dismissed'

export function OnboardingWizard() {
  const navigate = useNavigate()
  // Persist dismissal across reloads so the wizard does not pop back up
  // after the admin closed it.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  const { data } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async () => {
      const [projects, agents, clients] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).in('role', ['agent']),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
      ])
      return {
        hasProject: (projects.count ?? 0) > 0,
        hasAgent: (agents.count ?? 0) > 0,
        hasClient: (clients.count ?? 0) > 0,
      }
    },
    staleTime: 60_000,
  })

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  if (!data || dismissed) return null
  // Hide when onboarding is already complete (no mutation — just don't render)
  if (data.hasProject && data.hasAgent && data.hasClient) return null

  const steps: OnboardingStep[] = [
    { key: 'project', label: 'Creer votre 1er projet', icon: Building2, done: data.hasProject, action: () => navigate('/projects') },
    { key: 'agent', label: 'Inviter un agent', icon: UserPlus, done: data.hasAgent, action: () => navigate('/agents') },
    { key: 'client', label: 'Ajouter un client', icon: Users, done: data.hasClient, action: () => navigate('/pipeline') },
  ]

  const progress = steps.filter(s => s.done).length
  const pct = Math.round((progress / steps.length) * 100)

  return (
    <div className="rounded-xl border border-immo-accent-green/20 bg-immo-accent-green/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-immo-text-primary">Bienvenue ! Configurez votre espace</h3>
          <p className="text-xs text-immo-text-muted">{progress}/{steps.length} etapes completees</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-24 rounded-full bg-immo-border-default">
            <div className="h-full rounded-full bg-immo-accent-green transition-all" style={{ width: `${pct}%` }} />
          </div>
          <button onClick={dismiss} className="text-immo-text-muted hover:text-immo-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {steps.map(step => (
          <button
            key={step.key}
            onClick={step.action}
            disabled={step.done}
            className={`flex flex-1 items-center gap-3 rounded-lg border p-3 text-left transition-all ${
              step.done
                ? 'border-immo-accent-green/30 bg-immo-accent-green/10'
                : 'border-immo-border-default bg-immo-bg-card hover:border-immo-accent-green/30'
            }`}
          >
            {step.done ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-immo-accent-green" />
            ) : (
              <step.icon className="h-5 w-5 shrink-0 text-immo-text-muted" />
            )}
            <span className={`text-xs font-medium ${step.done ? 'text-immo-accent-green line-through' : 'text-immo-text-primary'}`}>
              {step.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
