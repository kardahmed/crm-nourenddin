import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().min(1, 'login.email_required').email('login.email_invalid'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgot_password.send_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-4" style={{fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div className="w-full max-w-[420px]">
        <Link to="/login" className="mb-4 flex items-center gap-1.5 text-[12px] text-[#8898AA] hover:text-[#0579DA]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('forgot_password.back_to_login')}
        </Link>

        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-xl shadow-black/[0.03] sm:p-10">
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00D4A0]/10">
                <CheckCircle className="h-8 w-8 text-[#00D4A0]" />
              </div>
              <h1 className="text-[20px]" style={{fontWeight:800,color:'#0A2540'}}>{t('forgot_password.email_sent')}</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-[#8898AA]">
                {t('forgot_password.email_sent_desc')}
              </p>
              <Link to="/login" className="mt-6 inline-flex h-[44px] items-center justify-center rounded-xl bg-[#0579DA] px-6 text-[14px] text-white hover:bg-[#0460B8]" style={{fontWeight:700}}>
                {t('forgot_password.back_to_login')}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-[22px]" style={{fontWeight:800,color:'#0A2540',letterSpacing:'-0.3px'}}>{t('forgot_password.title')}</h1>
                <p className="mt-1 text-[14px] text-[#8898AA]">{t('forgot_password.subtitle')}</p>
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#CD3D64]/20 bg-[#FFF0F3] px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#CD3D64]" />
                  <p className="text-sm text-[#CD3D64]">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[12px] text-[#425466]" style={{fontWeight:600}}>{t('login.email_label')}</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                    <input id="email" type="email" autoComplete="email" placeholder="vous@agence.com"
                      {...register('email')}
                      className={`h-[48px] w-full rounded-xl border bg-white pl-11 pr-4 text-[14px] text-[#0A2540] placeholder-[#B0BAC5] outline-none transition-all ${errors.email ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'}`} style={{fontFamily:'inherit'}} />
                  </div>
                  {errors.email && <p className="mt-1 text-[11px] text-[#CD3D64]">{t(errors.email.message ?? '')}</p>}
                </div>

                <button type="submit" disabled={loading}
                  className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[14px] text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  style={{background:'#0579DA',fontWeight:700,boxShadow:'0 4px 14px rgba(5,121,218,.25)'}}>
                  {loading ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>{t('forgot_password.sending')}</span></>
                  ) : (
                    <><Send className="h-4 w-4" /><span>{t('forgot_password.send_link')}</span></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
