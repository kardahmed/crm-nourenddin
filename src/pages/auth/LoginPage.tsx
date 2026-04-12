import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Check, BarChart3, Globe, Zap, Shield } from 'lucide-react'
// import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signIn, isAuthenticated, role } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (isAuthenticated) {
    const target = role === 'super_admin' ? '/admin' : '/dashboard'
    navigate(target, { replace: true })
    return null
  }

  async function onSubmit(data: FormData) {
    setError('')
    setLoading(true)
    try {
      await signIn(data.email, data.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  async function loginDemo() {
    setDemoLoading(true)
    setError('')
    try {
      await signIn('admin.elfeth@gmail.com', 'demo123456')
    } catch {
      setError('Compte demo indisponible')
    } finally {
      setDemoLoading(false)
    }
  }

  const FEATURES = [
    { icon: BarChart3, text: 'Pipeline de vente avec 9 etapes' },
    { icon: Globe, text: 'Landing pages & tracking publicitaire' },
    { icon: Zap, text: 'Scripts d\'appel IA & playbook' },
    { icon: Shield, text: 'Systeme de taches automatise' },
  ]

  return (
    <div className="flex min-h-screen animate-in fade-in duration-500">
      {/* Left — Branding panel */}
      <div className="hidden w-[440px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#0579DA] to-[#0456A0] p-10 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo-180.png" alt="IMMO PRO-X" className="h-11 w-11" />
            <div>
              <span className="text-xl font-bold">IMMO PRO-X</span>
              <p className="text-[10px] text-white/50">v2.0</p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-white/70">
            La plateforme CRM tout-en-un concue pour les promoteurs immobiliers algeriens. Gerez vos projets, suivez vos clients et vendez plus efficacement.
          </p>
        </div>

        <div className="space-y-4">
          {FEATURES.map(f => (
            <div key={f.text} className="flex items-center gap-3 text-sm text-white/80">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <f.icon className="h-4 w-4 text-white/70" />
              </div>
              {f.text}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {['YM', 'SB', 'NF', 'KA'].map(initials => (
                <div key={initials} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0579DA] bg-white/20 text-[9px] font-bold text-white">
                  {initials}
                </div>
              ))}
            </div>
            <span className="text-xs text-white/60">+50 promoteurs actifs</span>
          </div>
          <p className="text-[10px] text-white/30">© 2026 IMMO PRO-X. Tous droits reserves.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex flex-1 items-center justify-center bg-[#F6F9FC] px-4">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <img src="/logo-180.png" alt="IMMO PRO-X" className="h-10 w-10" />
            <span className="text-lg font-bold text-[#0A2540]">IMMO PRO-X</span>
          </div>

          <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-lg shadow-black/[0.04] sm:p-10">
            {/* Error */}
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#CD3D64]/20 bg-[#FFF0F3] px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#CD3D64]" />
                <p className="text-sm text-[#CD3D64]">{error}</p>
              </div>
            )}

            {/* Title */}
            <div className="mb-6 hidden lg:block">
              <h1 className="text-xl font-bold text-[#0A2540]">{t('login.connect_to')}</h1>
              <p className="mt-1 text-sm text-[#8898AA]">Entrez vos identifiants pour acceder a votre espace.</p>
            </div>

            {/* Mobile title */}
            <div className="mb-6 text-center lg:hidden">
              <h1 className="text-lg font-bold text-[#0A2540]">{t('login.connect_to')}</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#425466]">
                  {t('login.email_label')}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@agence.com"
                    {...register('email')}
                    className={`h-12 w-full rounded-lg border bg-white pl-11 pr-4 text-sm text-[#0A2540] placeholder-[#8898AA] outline-none transition-colors ${
                      errors.email ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-[#CD3D64]">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-[#425466]">
                    {t('login.password_label')}
                  </label>
                  <button type="button" className="text-[11px] font-medium text-[#0579DA] hover:underline">
                    Mot de passe oublie ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8898AA]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`h-12 w-full rounded-lg border bg-white pl-11 pr-12 text-sm text-[#0A2540] placeholder-[#8898AA] outline-none transition-colors ${
                      errors.password ? 'border-[#CD3D64]' : 'border-[#E3E8EF] focus:border-[#0579DA] focus:ring-2 focus:ring-[#0579DA]/10'
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8898AA] transition-colors hover:text-[#425466]">
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-[#CD3D64]">{errors.password.message}</p>}
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setRememberMe(!rememberMe)}
                  className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${rememberMe ? 'border-[#0579DA] bg-[#0579DA]' : 'border-[#E3E8EF]'}`}>
                  {rememberMe && <Check className="h-2.5 w-2.5 text-white" />}
                </button>
                <span className="text-xs text-[#8898AA]">Se souvenir de moi</span>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0579DA] text-sm font-bold text-white transition-all hover:bg-[#0461B3] hover:shadow-md hover:shadow-[#0579DA]/20 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>{t('login.loading')}</span></>
                ) : (
                  <><span>{t('login.submit')}</span><LogIn className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E3E8EF]" />
              <span className="text-[10px] font-medium text-[#8898AA]">OU</span>
              <div className="h-px flex-1 bg-[#E3E8EF]" />
            </div>

            {/* Demo login */}
            <button onClick={loginDemo} disabled={demoLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E3E8EF] bg-[#F6F9FC] text-sm font-medium text-[#425466] transition-all hover:border-[#0579DA]/30 hover:bg-[#0579DA]/5 hover:text-[#0579DA] disabled:opacity-60">
              {demoLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0579DA] border-t-transparent" /> :
                <><Zap className="h-4 w-4" /> Tester avec un compte demo</>
              }
            </button>

            {/* Footer links */}
            <div className="mt-5 space-y-2 text-center">
              <p className="text-[13px] text-[#8898AA]">
                Pas encore de compte ? <Link to="/register" className="font-medium text-[#0579DA] hover:underline">S'inscrire gratuitement</Link>
              </p>
            </div>
          </div>

          {/* Legal */}
          <div className="mt-4 flex justify-center gap-4 text-[10px] text-[#8898AA]">
            <a href="#" className="hover:text-[#425466]">Conditions d'utilisation</a>
            <span>·</span>
            <a href="#" className="hover:text-[#425466]">Politique de confidentialite</a>
            <span>·</span>
            <a href="#" className="hover:text-[#425466]">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}
