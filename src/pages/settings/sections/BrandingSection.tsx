import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { SectionHeader, Field, SaveButton, inputClass } from './shared'
import { ImageUploader } from '@/pages/landing/components/ImageUploader'

export function BrandingSection() {
  const { t } = useTranslation()
  const { tenantId } = useAuthStore()
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings-branding', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_settings').select('custom_logo_url, custom_primary_color, custom_app_name').eq('tenant_id', tenantId!).maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any as { custom_logo_url: string | null; custom_primary_color: string | null; custom_app_name: string | null } | null
    },
    enabled: !!tenantId,
  })

  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0579DA')
  const [appName, setAppName] = useState('')

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.custom_logo_url ?? '')
      setPrimaryColor(settings.custom_primary_color ?? '#0579DA')
      setAppName(settings.custom_app_name ?? '')
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        custom_logo_url: logoUrl || null,
        custom_primary_color: primaryColor || null,
        custom_app_name: appName || null,
      }
      if (settings) {
        await supabase.from('tenant_settings').update(payload as never).eq('tenant_id', tenantId!)
      } else {
        await supabase.from('tenant_settings').insert({ tenant_id: tenantId, ...payload } as never)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings-branding'] }); toast.success(t('success.saved')) },
  })

  return (
    <div className="space-y-5">
      <SectionHeader title="Personnalisation" subtitle="Logo, couleurs et nom de votre espace" />

      <div className="space-y-4">
        <Field label="Nom de l'application">
          <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="IMMO PRO-X" className={inputClass} />
          <p className="mt-1 text-[10px] text-immo-text-muted">Remplace "IMMO PRO-X" dans la sidebar et le titre</p>
        </Field>

        <Field label="Logo">
          <ImageUploader value={logoUrl} onChange={setLogoUrl} label="Uploader votre logo" />
          {logoUrl && <img src={logoUrl} alt="Logo" className="mt-2 h-10 object-contain" />}
        </Field>

        <Field label="Couleur principale">
          <div className="flex items-center gap-3">
            <Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-20 cursor-pointer" />
            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#0579DA" className={`w-32 ${inputClass}`} />
            <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: primaryColor }} />
          </div>
          <p className="mt-1 text-[10px] text-immo-text-muted">Couleur des boutons, accents et liens dans votre espace</p>
        </Field>

        {/* Preview */}
        <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary p-4">
          <p className="mb-2 text-[10px] font-medium text-immo-text-muted">Apercu</p>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                {(appName || 'IP').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-bold" style={{ color: primaryColor }}>{appName || 'IMMO PRO-X'}</span>
          </div>
        </div>
      </div>

      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}
