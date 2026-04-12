import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-immo-bg-primary">
      <div className="text-6xl font-bold text-immo-accent-green">404</div>
      <p className="text-immo-text-secondary">Page introuvable</p>
      <Link
        to="/dashboard"
        className="text-sm text-immo-accent-blue hover:underline"
      >
        Retour au dashboard
      </Link>
    </div>
  )
}
