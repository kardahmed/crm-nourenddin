import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
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
 * Landing page after the user clicks the reset-password link in their email.
 * Supabase auto-creates a recovery session, so we just need to call updateUser.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      // Sign out so the user logs in with the new password fresh
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du mot de passe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-4" style={{fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-xl shadow-black/[0.03] sm:p-10">
          <div className="mb-6">
            <h1 className="text-[22px]" style={{fontWeight:800,color:'#0A2540',letterSpacing:'-0.3px'}}>Nouveau mot de passe</h1>
            <p className="mt-1 text-[14px] text-[#8898AA]">Choisissez un mot de passe d'au moins 8 caractères.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#CD3D64]/20 bg-[#FFF0F3] px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#CD3D64]" />
              <p className="text-sm text-[#CD3D64]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[12px] text-[#425466]" style={{fontWeight:600}}>Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••"
                  {...register('password')}
                  className={`h-[48px] w-full rounded-xl border bg-white pl-11 pr-12 text-[14px] text-[#0A2540] placeholder-[#B0BAC5] outline-none transition-all ${errors.password ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'}`} style={{fontFamily:'inherit'}} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8898AA] transition-colors hover:text-[#425466]">
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] text-[#CD3D64]">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-[12px] text-[#425466]" style={{fontWeight:600}}>Confirmer</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                <input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••"
                  {...register('confirm')}
                  className={`h-[48px] w-full rounded-xl border bg-white pl-11 pr-4 text-[14px] text-[#0A2540] placeholder-[#B0BAC5] outline-none transition-all ${errors.confirm ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'}`} style={{fontFamily:'inherit'}} />
              </div>
              {errors.confirm && <p className="mt-1 text-[11px] text-[#CD3D64]">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[14px] text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={{background:'#0579DA',fontWeight:700,boxShadow:'0 4px 14px rgba(5,121,218,.25)'}}>
              {loading ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Enregistrement…</span></>
              ) : (
                <><Save className="h-4 w-4" /><span>Enregistrer</span></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-[#8898AA]">
            <Link to="/login" className="text-[#0579DA] hover:underline" style={{fontWeight:600}}>Annuler</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
