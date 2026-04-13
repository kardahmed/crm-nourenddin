import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, DollarSign, FileText, Target, Globe, Sparkles, MessageCircle, Zap, Receipt, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

// Map feature toggle key → plan_limits.features key (null = always available, no plan restriction)
const FEATURES = [
  { key: 'feature_payment_tracking', label: 'Suivi des echeanciers', desc: 'Gestion des paiements, echeanciers, relances de retard', icon: DollarSign, color: 'text-immo-accent-green', planFeature: null, minPlan: null },
  { key: 'feature_charges', label: 'Charges & frais', desc: 'Frais notaire, agence, enregistrement par dossier', icon: Receipt, color: 'text-immo-status-orange', planFeature: null, minPlan: null },
  { key: 'feature_documents', label: 'Generation de documents', desc: 'Contrats, echeanciers, bons de reservation en PDF', icon: FileText, color: 'text-immo-accent-blue', planFeature: 'pdf_generation', minPlan: 'starter' },
  { key: 'feature_goals', label: 'Objectifs de vente', desc: 'Objectifs mensuels/trimestriels par agent', icon: Target, color: 'text-purple-500', planFeature: null, minPlan: null },
  { key: 'feature_landing_pages', label: 'Pages de capture', desc: 'Landing pages pour vos campagnes publicitaires', icon: Globe, color: 'text-immo-accent-blue', planFeature: null, minPlan: 'pro' },
  { key: 'feature_ai_scripts', label: 'Scripts d\'appel IA', desc: 'Generation de scripts personnalises par intelligence artificielle', icon: Sparkles, color: 'text-purple-500', planFeature: 'ai_scripts', minPlan: 'pro' },
  { key: 'feature_whatsapp', label: 'WhatsApp Business', desc: 'Envoi automatique de messages WhatsApp aux clients', icon: MessageCircle, color: 'text-green-500', planFeature: null, minPlan: 'starter' },
  { key: 'feature_auto_tasks', label: 'Taches automatiques', desc: 'Generation et suivi automatique des taches par etape', icon: Zap, color: 'text-immo-status-orange', planFeature: null, minPlan: null },
] as const

type FeatureKey = typeof FEATURES[number]['key']

const PLAN_ORDER = ['free', 'starter', 'pro', 'enterprise']
const PLAN_LABELS: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

export function FeaturesSection() {
  const tenantId = useAuthStore(s => s.tenantId)
  const qc = useQueryClient()

  // Get tenant plan
  const { data: tenantPlan } = useQuery({
    queryKey: ['tenant-plan', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('plan' as never).eq('id', tenantId!).single()
      return (data as unknown as { plan: string } | null)?.plan ?? 'free'
    },
    enabled: !!tenantId,
  })

  // Get plan features
  const { data: planFeatures } = useQuery({
    queryKey: ['plan-features', tenantPlan],
    queryFn: async () => {
      const { data } = await supabase.from('plan_limits').select('features').eq('plan', tenantPlan!).single()
      return (data as unknown as { features: Record<string, boolean> } | null)?.features ?? {}
    },
    enabled: !!tenantPlan,
  })

  const { data: settings } = useQuery({
    queryKey: ['tenant-features', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_settings')
        .select('feature_payment_tracking, feature_charges, feature_documents, feature_goals, feature_landing_pages, feature_ai_scripts, feature_whatsapp, feature_auto_tasks' as never)
        .eq('tenant_id', tenantId!)
        .single()
      return data as unknown as Record<FeatureKey, boolean> | null
    },
    enabled: !!tenantId,
  })

  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    feature_payment_tracking: true,
    feature_charges: true,
    feature_documents: true,
    feature_goals: true,
    feature_landing_pages: true,
    feature_ai_scripts: true,
    feature_whatsapp: true,
    feature_auto_tasks: true,
  })

  useEffect(() => {
    if (settings) {
      setFeatures({
        feature_payment_tracking: settings.feature_payment_tracking ?? true,
        feature_charges: settings.feature_charges ?? true,
        feature_documents: settings.feature_documents ?? true,
        feature_goals: settings.feature_goals ?? true,
        feature_landing_pages: settings.feature_landing_pages ?? true,
        feature_ai_scripts: settings.feature_ai_scripts ?? true,
        feature_whatsapp: settings.feature_whatsapp ?? true,
        feature_auto_tasks: settings.feature_auto_tasks ?? true,
      })
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from('tenant_settings').update(features as never).eq('tenant_id', tenantId!)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-features'] }); toast.success('Fonctionnalites mises a jour') },
  })

  // Check if a feature is allowed by the current plan
  function isAllowedByPlan(feat: typeof FEATURES[number]): boolean {
    // No plan restriction
    if (!feat.minPlan && !feat.planFeature) return true
    // Check min plan
    if (feat.minPlan) {
      const currentIdx = PLAN_ORDER.indexOf(tenantPlan ?? 'free')
      const requiredIdx = PLAN_ORDER.indexOf(feat.minPlan)
      if (currentIdx < requiredIdx) return false
    }
    // Check specific plan feature flag
    if (feat.planFeature && planFeatures) {
      if (!planFeatures[feat.planFeature]) return false
    }
    return true
  }

  function toggle(key: FeatureKey) {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activeCount = FEATURES.filter(f => isAllowedByPlan(f) && features[f.key]).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-immo-text-primary">Fonctionnalites</h2>
        <p className="text-xs text-immo-text-muted">
          Activez ou desactivez les modules selon les besoins de votre agence ({activeCount}/{FEATURES.length} actifs)
          {tenantPlan && <span className="ml-2 rounded-full bg-immo-accent-blue/10 px-2 py-0.5 text-[10px] font-semibold text-immo-accent-blue">Plan {PLAN_LABELS[tenantPlan] ?? tenantPlan}</span>}
        </p>
      </div>

      <div className="space-y-3">
        {FEATURES.map(feat => {
          const Icon = feat.icon
          const allowed = isAllowedByPlan(feat)
          const isOn = allowed && features[feat.key]

          return (
            <div key={feat.key} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
              !allowed ? 'border-immo-border-default/30 bg-immo-bg-primary opacity-50' :
              isOn ? 'border-immo-border-default bg-immo-bg-card' : 'border-immo-border-default/50 bg-immo-bg-primary opacity-70'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isOn ? 'bg-immo-bg-card-hover' : 'bg-immo-bg-primary'}`}>
                  {allowed ? (
                    <Icon className={`h-4 w-4 ${isOn ? feat.color : 'text-immo-text-muted'}`} />
                  ) : (
                    <Lock className="h-4 w-4 text-immo-text-muted" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isOn ? 'text-immo-text-primary' : 'text-immo-text-muted'}`}>{feat.label}</p>
                    {!allowed && feat.minPlan && (
                      <span className="rounded-full bg-immo-status-orange/10 px-2 py-0.5 text-[9px] font-bold text-immo-status-orange">
                        Plan {PLAN_LABELS[feat.minPlan]} requis
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-immo-text-muted">{feat.desc}</p>
                </div>
              </div>
              {allowed ? (
                <button
                  onClick={() => toggle(feat.key)}
                  className={`relative h-6 w-11 rounded-full transition-all ${isOn ? 'bg-immo-accent-green' : 'bg-immo-border-default'}`}
                >
                  <div className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                    style={{ left: isOn ? '22px' : '2px' }} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-immo-text-muted">
                  <Lock className="h-3 w-3" />
                  <a href="/settings" className="text-immo-accent-blue hover:underline">Upgrader</a>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-immo-accent-green text-white text-xs hover:bg-immo-accent-green/90">
        <Save className="mr-1.5 h-4 w-4" /> {save.isPending ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  )
}
