import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, DollarSign, FileText, Target, Globe, Sparkles, MessageCircle, Zap, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

const FEATURE_KEYS = [
  'feature_payment_tracking',
  'feature_charges',
  'feature_documents',
  'feature_goals',
  'feature_landing_pages',
  'feature_ai_scripts',
  'feature_whatsapp',
  'feature_auto_tasks',
] as const

type FeatureKey = typeof FEATURE_KEYS[number]

const FEATURE_META: Record<FeatureKey, { labelKey: string; descKey: string; icon: typeof DollarSign; color: string }> = {
  feature_payment_tracking: { labelKey: 'settings_features.payment_tracking', descKey: 'settings_features.payment_tracking_desc', icon: DollarSign, color: 'text-immo-accent-green' },
  feature_charges: { labelKey: 'settings_features.charges', descKey: 'settings_features.charges_desc', icon: Receipt, color: 'text-immo-status-orange' },
  feature_documents: { labelKey: 'settings_features.documents', descKey: 'settings_features.documents_desc', icon: FileText, color: 'text-immo-accent-blue' },
  feature_goals: { labelKey: 'settings_features.goals', descKey: 'settings_features.goals_desc', icon: Target, color: 'text-purple-500' },
  feature_landing_pages: { labelKey: 'settings_features.landing_pages', descKey: 'settings_features.landing_pages_desc', icon: Globe, color: 'text-immo-accent-blue' },
  feature_ai_scripts: { labelKey: 'settings_features.ai_scripts', descKey: 'settings_features.ai_scripts_desc', icon: Sparkles, color: 'text-purple-500' },
  feature_whatsapp: { labelKey: 'settings_features.whatsapp', descKey: 'settings_features.whatsapp_desc', icon: MessageCircle, color: 'text-green-500' },
  feature_auto_tasks: { labelKey: 'settings_features.auto_tasks', descKey: 'settings_features.auto_tasks_desc', icon: Zap, color: 'text-immo-status-orange' },
}

export function FeaturesSection() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['app-settings-features'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings' as never)
        .select('feature_payment_tracking, feature_charges, feature_documents, feature_goals, feature_landing_pages, feature_ai_scripts, feature_whatsapp, feature_auto_tasks')
        .limit(1)
        .single()
      return data as unknown as Record<FeatureKey, boolean> | null
    },
  })

  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    feature_payment_tracking: true,
    feature_charges: true,
    feature_documents: true,
    feature_goals: true,
    feature_landing_pages: false,
    feature_ai_scripts: true,
    feature_whatsapp: true,
    feature_auto_tasks: true,
  })

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding toggles from async query
      setFeatures({
        feature_payment_tracking: settings.feature_payment_tracking ?? true,
        feature_charges: settings.feature_charges ?? true,
        feature_documents: settings.feature_documents ?? true,
        feature_goals: settings.feature_goals ?? true,
        feature_landing_pages: settings.feature_landing_pages ?? false,
        feature_ai_scripts: settings.feature_ai_scripts ?? true,
        feature_whatsapp: settings.feature_whatsapp ?? true,
        feature_auto_tasks: settings.feature_auto_tasks ?? true,
      })
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      // Single-tenant: update the sole app_settings row
      const { data: existing } = await supabase.from('app_settings' as never).select('id').limit(1).maybeSingle()
      const id = (existing as { id: string } | null)?.id
      if (!id) throw new Error('app_settings row missing')
      await supabase.from('app_settings' as never).update(features as never).eq('id', id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings-features'] }); toast.success(t('settings_features.saved_toast')) },
  })

  function toggle(key: FeatureKey) {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activeCount = FEATURE_KEYS.filter(k => features[k]).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-immo-text-primary">{t('settings_features.title')}</h2>
        <p className="text-xs text-immo-text-muted">
          {t('settings_features.subtitle', { active: activeCount, total: FEATURE_KEYS.length })}
        </p>
      </div>

      <div className="space-y-3">
        {FEATURE_KEYS.map(key => {
          const meta = FEATURE_META[key]
          const Icon = meta.icon
          const isOn = features[key]

          return (
            <div key={key} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
              isOn ? 'border-immo-border-default bg-immo-bg-card' : 'border-immo-border-default/50 bg-immo-bg-primary opacity-70'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isOn ? 'bg-immo-bg-card-hover' : 'bg-immo-bg-primary'}`}>
                  <Icon className={`h-4 w-4 ${isOn ? meta.color : 'text-immo-text-muted'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isOn ? 'text-immo-text-primary' : 'text-immo-text-muted'}`}>{t(meta.labelKey)}</p>
                  <p className="text-[11px] text-immo-text-muted">{t(meta.descKey)}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(key)}
                className={`relative h-6 w-11 rounded-full transition-all ${isOn ? 'bg-immo-accent-green' : 'bg-immo-border-default'}`}
              >
                <div className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: isOn ? '22px' : '2px' }} />
              </button>
            </div>
          )
        })}
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-immo-accent-green text-white text-xs hover:bg-immo-accent-green/90">
        <Save className="mr-1.5 h-4 w-4" /> {save.isPending ? t('settings_features.saving') : t('settings_features.save')}
      </Button>
    </div>
  )
}
