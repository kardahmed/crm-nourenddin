import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { LoadingSpinner } from '@/components/common'
import { Input } from '@/components/ui/input'
import { WILAYAS } from '@/lib/constants'
import toast from 'react-hot-toast'
import { SectionHeader, Field, SaveButton, inputClass } from './shared'

interface CompanyRow {
  id: string
  company_name: string | null
  company_phone: string | null
  company_email: string | null
  company_address: string | null
  company_website: string | null
  company_wilaya: string | null
}

export function CompanySection() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings-company'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings' as never)
        .select('id, company_name, company_phone, company_email, company_address, company_website, company_wilaya')
        .limit(1)
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as CompanyRow
    },
  })

  const [form, setForm] = useState({
    company_name: '',
    company_phone: '',
    company_email: '',
    company_address: '',
    company_website: '',
    company_wilaya: '',
  })

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding form state from async query; one-shot per settings identity
      setForm({
        company_name: settings.company_name ?? '',
        company_phone: settings.company_phone ?? '',
        company_email: settings.company_email ?? '',
        company_address: settings.company_address ?? '',
        company_website: settings.company_website ?? '',
        company_wilaya: settings.company_wilaya ?? '',
      })
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error('app_settings row missing')
      const { error } = await supabase.from('app_settings' as never).update(form as never).eq('id', settings.id)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings-company'] }); toast.success(t('success.saved')) },
  })

  if (isLoading) return <LoadingSpinner className="h-40" />

  return (
    <div className="space-y-5">
      <SectionHeader title={t('nav.settings')} subtitle={t('page.settings_subtitle')} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('field.name') + ' *'}><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className={inputClass} /></Field>
        <Field label={t('field.phone')}><Input value={form.company_phone} onChange={e => setForm(f => ({ ...f, company_phone: e.target.value }))} className={inputClass} /></Field>
        <Field label={t('field.email')}><Input type="email" value={form.company_email} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} className={inputClass} /></Field>
        <Field label="Site web"><Input value={form.company_website} onChange={e => setForm(f => ({ ...f, company_website: e.target.value }))} className={inputClass} /></Field>
        <Field label={t('field.address')}><Input value={form.company_address} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} className={inputClass} /></Field>
        <Field label="Wilaya">
          <select value={form.company_wilaya} onChange={e => setForm(f => ({ ...f, company_wilaya: e.target.value }))} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
            <option value="">{t('action.select')}</option>
            {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}
