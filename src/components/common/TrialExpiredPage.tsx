import { Clock, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function TrialExpiredPage() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-immo-bg-primary px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-immo-status-orange/10">
          <Clock className="h-8 w-8 text-immo-status-orange" />
        </div>
        <h1 className="text-xl font-bold text-immo-text-primary">Essai gratuit expire</h1>
        <p className="mt-2 text-sm text-immo-text-muted">
          Votre periode d'essai est terminee. Passez a un plan payant pour continuer a utiliser IMMO PRO-X.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-immo-accent-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-immo-accent-green/90 transition-colors"
          >
            Voir les plans <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => signOut()}
            className="text-xs text-immo-text-muted hover:text-immo-text-secondary transition-colors"
          >
            Se deconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
