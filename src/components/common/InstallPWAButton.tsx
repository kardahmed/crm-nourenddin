import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface InstallPWAButtonProps {
  variant?: 'icon' | 'full'
  className?: string
}

export function InstallPWAButton({ variant = 'icon', className = '' }: InstallPWAButtonProps) {
  const { canInstall, install } = usePWAInstall()

  if (!canInstall) return null

  async function handleClick() {
    const ok = await install()
    if (ok) toast.success('Application installée')
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 rounded-lg bg-immo-accent-green px-3 py-2 text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90 ${className}`}
      >
        <Download className="h-4 w-4" />
        <span>Installer l'app</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      title="Installer l'application"
      className={`rounded-lg p-2 text-immo-text-muted transition-colors hover:bg-immo-bg-card-hover hover:text-immo-accent-green ${className}`}
    >
      <Download className="h-4 w-4" />
    </button>
  )
}
