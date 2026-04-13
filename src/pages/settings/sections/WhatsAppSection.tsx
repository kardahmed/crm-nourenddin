import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Check, AlertTriangle, Zap, Crown, Rocket } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { StatusBadge } from '@/components/common'
import { formatDistanceToNow } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale'

interface WaPlan {
  name: string
  label: string
  monthly_quota: number
  price_da: number
  features: Record<string, boolean>
}

const PLAN_ICONS: Record<string, typeof Zap> = { starter: Zap, pro: Rocket, premium: Crown }

export function WhatsAppSection() {
  const tenantId = useAuthStore(s => s.tenantId)

  const { data: account } = useQuery({
    queryKey: ['wa-account', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_accounts').select('*').eq('tenant_id', tenantId!).single()
      return data as Record<string, unknown> | null
    },
    enabled: !!tenantId,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['wa-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_plans').select('*').eq('is_active', true).order('sort_order')
      return (data ?? []) as unknown as WaPlan[]
    },
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['wa-messages-tenant', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*, clients(full_name)')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(20)
      return (data ?? []) as Array<Record<string, unknown>>
    },
    enabled: !!tenantId,
  })

  const isActive = account?.is_active as boolean ?? false
  const sent = (account?.messages_sent as number) ?? 0
  const quota = (account?.monthly_quota as number) ?? 0
  const currentPlan = (account?.plan as string) ?? 'starter'
  const percentage = quota > 0 ? Math.round((sent / quota) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-immo-text-primary">WhatsApp Business</h2>
        <p className="text-xs text-immo-text-muted">Envoi automatique de messages WhatsApp a vos clients</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-green-500/10' : 'bg-immo-bg-card-hover'}`}>
              <MessageCircle className={`h-5 w-5 ${isActive ? 'text-green-500' : 'text-immo-text-muted'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-immo-text-primary">
                {isActive ? 'WhatsApp actif' : 'WhatsApp non active'}
              </p>
              <p className="text-xs text-immo-text-muted">
                {isActive
                  ? `Pack ${plans.find(p => p.name === currentPlan)?.label ?? currentPlan}`
                  : 'Contactez l\'administrateur pour activer ce service'}
              </p>
            </div>
          </div>
          <StatusBadge label={isActive ? 'Actif' : 'Inactif'} type={isActive ? 'green' : 'muted'} />
        </div>

        {isActive && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-immo-text-muted">Quota mensuel</span>
              <span className={`font-semibold ${percentage > 90 ? 'text-immo-status-red' : percentage > 70 ? 'text-immo-status-orange' : 'text-immo-accent-green'}`}>
                {sent} / {quota > 99000 ? 'Illimite' : quota} messages
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-immo-bg-primary">
              <div
                className={`h-full rounded-full transition-all ${percentage > 90 ? 'bg-immo-status-red' : percentage > 70 ? 'bg-immo-status-orange' : 'bg-green-500'}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            {percentage > 90 && (
              <p className="flex items-center gap-1 text-[10px] text-immo-status-red">
                <AlertTriangle className="h-3 w-3" /> Quota presque atteint. Contactez l'administrateur pour passer au pack superieur.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Plans */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-immo-text-primary">Packs disponibles</h3>
        <div className="grid grid-cols-3 gap-4">
          {plans.map(plan => {
            const Icon = PLAN_ICONS[plan.name] ?? Zap
            const isCurrent = isActive && currentPlan === plan.name
            return (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-5 transition-all ${
                  isCurrent
                    ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20'
                    : 'border-immo-border-default bg-immo-bg-card hover:border-immo-accent-blue/30'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 right-3 rounded-full bg-green-500 px-2.5 py-0.5 text-[9px] font-bold text-white">
                    ACTUEL
                  </div>
                )}
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${isCurrent ? 'bg-green-500/10' : 'bg-immo-bg-card-hover'}`}>
                  <Icon className={`h-4 w-4 ${isCurrent ? 'text-green-500' : 'text-immo-text-muted'}`} />
                </div>
                <h4 className="text-sm font-bold text-immo-text-primary">{plan.label}</h4>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-immo-text-primary">
                    {plan.price_da.toLocaleString('fr-DZ')}
                  </span>
                  <span className="text-xs text-immo-text-muted">DA/mois</span>
                </div>
                <p className="mt-2 text-xs text-immo-text-muted">
                  {plan.monthly_quota > 99000 ? 'Messages illimites' : `${plan.monthly_quota.toLocaleString()} messages/mois`}
                </p>
                <ul className="mt-3 space-y-1.5">
                  <li className="flex items-center gap-1.5 text-[11px] text-immo-text-secondary">
                    <Check className="h-3 w-3 text-green-500" /> Envoi automatique
                  </li>
                  {plan.features?.priority_support && (
                    <li className="flex items-center gap-1.5 text-[11px] text-immo-text-secondary">
                      <Check className="h-3 w-3 text-green-500" /> Support prioritaire
                    </li>
                  )}
                  {plan.features?.unlimited && (
                    <li className="flex items-center gap-1.5 text-[11px] text-immo-text-secondary">
                      <Check className="h-3 w-3 text-green-500" /> Sans limite
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
        {!isActive && (
          <p className="mt-3 text-center text-xs text-immo-text-muted">
            Pour souscrire a un pack WhatsApp, contactez votre administrateur IMMO PRO-X.
          </p>
        )}
      </div>

      {/* Recent messages */}
      {isActive && messages.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-immo-text-primary">Messages recents</h3>
          <div className="overflow-hidden rounded-xl border border-immo-border-default">
            <div className="max-h-[300px] divide-y divide-immo-border-default overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id as string} className="flex items-center gap-3 bg-immo-bg-card px-4 py-3 hover:bg-immo-bg-card-hover">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.status === 'failed' ? 'bg-immo-status-red/10' : 'bg-green-500/10'}`}>
                    {msg.status === 'failed' ? <AlertTriangle className="h-3.5 w-3.5 text-immo-status-red" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-immo-text-primary">{(msg.clients as { full_name: string } | null)?.full_name ?? msg.to_phone as string}</p>
                    <p className="text-[10px] text-immo-text-muted">{msg.template_name as string}</p>
                  </div>
                  <span className="text-[10px] text-immo-text-muted">
                    {formatDistanceToNow(new Date(msg.created_at as string), { addSuffix: true, locale: frLocale })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
