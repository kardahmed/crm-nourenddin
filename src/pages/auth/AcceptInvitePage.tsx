import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  password: z.string().min(8, 'Au moins 8 caractères'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

/**
 * Accept user invitation page. Handles the link from invitation email.
 * Supabase auto-creates a recovery session via the token in the URL,
 * so we just need to call updateUser to set the password.
 */
export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userInfo, setUserInfo] = useState<{ email?: string; first_name?: string; last_name?: string } | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Check if we have an active session from the invitation link
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data?.session?.user) {
        setError('Lien d\'invitation invalide ou expiré. Demandez une nouvelle invitation.')
      } else {
        setUserInfo({
          email: data.session.user.email,
          first_name: data.session.user.user_metadata?.first_name,
          last_name: data.session.user.user_metadata?.last_name,
        })
      }
    }
    checkSession()
  }, [])

  async function onSubmit(data: FormData) {
    setError('')
    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: data.password })
      if (updateErr) throw updateErr
      setSuccess(true)
      // Redirect after short delay for UX
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la configuration du mot de passe')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-4" style={{ fontFamily: "'Inter',-apple-system,sans-serif" }}>
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-xl shadow-black/[0.03] sm:p-10">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00D4A0]/10">
                <CheckCircle className="h-8 w-8 text-[#00D4A0]" />
              </div>
              <h1 className="text-[20px]" style={{ fontWeight: 800, color: '#0A2540' }}>Compte configuré !</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-[#8898AA]">
                Votre mot de passe a été défini avec succès. Vous allez être redirigé vers votre espace.
              </p>
              <div className="mt-6 text-[13px] text-[#8898AA]">
                Redirection en cours...
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-4" style={{ fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-xl shadow-black/[0.03] sm:p-10">
          <div className="mb-6">
            <h1 className="text-[22px]" style={{ fontWeight: 800, color: '#0A2540', letterSpacing: '-0.3px' }}>Bienvenue !</h1>
            <p className="mt-1 text-[14px] text-[#8898AA]">Configurez votre mot de passe pour accéder à votre espace.</p>
            {userInfo?.email && (
              <p className="mt-2 text-[12px] text-[#8898AA]">
                Email: <strong>{userInfo.email}</strong>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#CD3D64]/20 bg-[#FFF0F3] px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#CD3D64]" />
              <p className="text-sm text-[#CD3D64]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[12px] text-[#425466]" style={{ fontWeight: 600 }}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`h-[48px] w-full rounded-xl border bg-white pl-11 pr-12 text-[14px] text-[#0A2540] placeholder-[#B0BAC5] outline-none transition-all ${
                    errors.password ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'
                  }`}
                  style={{ fontFamily: 'inherit' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8898AA] hover:text-[#0A2540]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] text-[#CD3D64]">{errors.password.message}</p>}
              <p className="mt-1 text-[11px] text-[#8898AA]">Minimum 8 caractères</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-[12px] text-[#425466]" style={{ fontWeight: 600 }}>
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('confirm')}
                  className={`h-[48px] w-full rounded-xl border bg-white pl-11 pr-12 text-[14px] text-[#0A2540] placeholder-[#B0BAC5] outline-none transition-all ${
                    errors.confirm ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'
                  }`}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              {errors.confirm && <p className="mt-1 text-[11px] text-[#CD3D64]">{errors.confirm.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[14px] text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: '#0579DA', fontWeight: 700, boxShadow: '0 4px 14px rgba(5,121,218,.25)' }}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Configuration…</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Définir le mot de passe</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E3E8EF' }}>
            <p style={{ fontSize: '12px', color: '#8898AA', lineHeight: '1.6', margin: 0 }}>
              Ce lien d'invitation est personnel et ne doit pas être partagé. Il expire après utilisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
