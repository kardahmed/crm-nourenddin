import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { LoadingSpinner } from '@/components/common'
import { Input } from '@/components/ui/input'
import { WILAYAS } from '@/lib/constants'
import toast from 'react-hot-toast'
import { SectionHeader, Field, SaveButton, inputClass } from './shared'

export function CompanySection() {
  const { t } = useTranslation()
  const {} = useAuthStore()
  const qc = useQueryClient()

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => {
      const { data, error } = await Promise.resolve({ data: null, error: null })
      if (error) { handleSupabaseError(error); throw error }
      return data as Record<string, unknown>
    },
    enabled: true,
  })

  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (tenant) {
      setForm({
        name: (tenant.name as string) ?? '',
        phone: (tenant.phone as string) ?? '',
        email: (tenant.email as string) ?? '',
        address: (tenant.address as string) ?? '',
        website: (tenant.website as string) ?? '',
        wilaya: (tenant.wilaya as string) ?? '',
      })
    }
  }, [tenant])

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await Promise.resolve({ error: null })
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant'] }); toast.success(t('success.saved')) },
  })

  if (isLoading) return <LoadingSpinner className="h-40" />

  return (
    <div className="space-y-5">
      <SectionHeader title={t('nav.settings')} subtitle={t('page.settings_subtitle')} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('field.name') + ' *'}><Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} /></Field>
        <Field label={t('field.phone')}><Input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></Field>
        <Field label={t('field.email')}><Input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
        <Field label="Site web"><Input value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} /></Field>
        <Field label={t('field.address')}><Input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputClass} /></Field>
        <Field label="Wilaya">
          <select value={form.wilaya ?? ''} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
            <option value="">{t('action.select')}</option>
            {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <SaveButton onClick={() => save.mutate()} loading={save.isPending} />
    </div>
  )
}
