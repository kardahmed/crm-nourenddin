import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-immo-bg-primary px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-immo-accent-green/5 blur-[120px]" />
      </div>

      <Card className="relative w-full max-w-[420px] border-immo-border-default bg-immo-bg-card shadow-2xl">
        <CardHeader className="space-y-4 pb-2 pt-8 text-center">
          {/* Logo */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-immo-accent-green/10 ring-1 ring-immo-accent-green/20">
            <Building2 className="h-7 w-7 text-immo-accent-green" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-immo-text-primary">
              IMMO PRO-X
            </h1>
            <p className="mt-1 text-sm text-immo-text-muted">
              Connectez-vous à votre espace
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-immo-status-red/30 bg-immo-status-red-bg px-4 py-3 text-sm text-immo-status-red">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-immo-text-secondary">
                Adresse email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@agence.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:ring-immo-accent-green"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-immo-text-secondary">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-immo-border-default bg-immo-bg-primary pr-10 text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:ring-immo-accent-green"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-immo-text-muted hover:text-immo-text-secondary"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Connexion
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-immo-text-muted">
            Première connexion ? Contactez votre administrateur
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
