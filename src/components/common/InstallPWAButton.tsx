import { useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface InstallPWAButtonProps {
  variant?: 'icon' | 'full'
  className?: string
}

export function InstallPWAButton({ variant = 'icon', className = '' }: InstallPWAButtonProps) {
  const { canInstall, isIOS, showIOSPrompt, dismissIOSPrompt, install } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  async function handleClick() {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }
    const ok = await install()
    if (ok) toast.success('Application installée')
  }

  if (!canInstall && !isIOS) return null

  const button = variant === 'full' ? (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 rounded-lg bg-immo-accent-green px-3 py-2 text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90 ${className}`}
    >
      <Download className="h-4 w-4" />
      <span>Installer l'app</span>
    </button>
  ) : (
    <button
      onClick={handleClick}
      title="Installer l'application"
      className={`rounded-lg p-2 text-immo-text-muted transition-colors hover:bg-immo-bg-card-hover hover:text-immo-accent-green ${className}`}
    >
      <Download className="h-4 w-4" />
    </button>
  )

  return (
    <>
      {button}

      {showIOSPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-xl border border-immo-border-default bg-immo-bg-card p-4 shadow-lg">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-immo-accent-green" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">Installer IMMO PRO-X</p>
            <p className="mt-0.5 text-xs text-immo-text-muted">
              Appuyez sur <Share className="inline h-3.5 w-3.5 -translate-y-px" /> puis
              <span className="font-medium text-immo-text-primary"> « Sur l'écran d'accueil »</span>
            </p>
          </div>
          <button onClick={dismissIOSPrompt} className="shrink-0 rounded-lg p-1 text-immo-text-muted hover:bg-immo-bg-card-hover">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIOSModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-immo-border-default bg-immo-bg-card p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-immo-text-primary">Installer l'application</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-immo-accent-blue/10 text-sm font-bold text-immo-accent-blue">1</div>
                <p className="text-sm text-immo-text-secondary">
                  Appuyez sur <Share className="inline h-4 w-4 -translate-y-px text-immo-accent-blue" /> en bas de l'écran
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-immo-accent-blue/10 text-sm font-bold text-immo-accent-blue">2</div>
                <p className="text-sm text-immo-text-secondary">
                  Faites défiler et appuyez sur <Plus className="inline h-4 w-4 -translate-y-px" /> <span className="font-medium text-immo-text-primary">Sur l'écran d'accueil</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-immo-accent-blue/10 text-sm font-bold text-immo-accent-blue">3</div>
                <p className="text-sm text-immo-text-secondary">
                  Confirmez en appuyant sur <span className="font-medium text-immo-text-primary">Ajouter</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-immo-accent-green py-2.5 text-sm font-semibold text-white hover:bg-immo-accent-green/90"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  )
}
