import { useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface InstallPWAButtonProps {
  variant?: 'icon' | 'full'
  className?: string
}

export function InstallPWAButton({ variant = 'icon', className = '' }: InstallPWAButtonProps) {
  const { canInstall, isIOS, showIOSBanner, showPromptBanner, dismissBanner, install } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  async function handleClick() {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }
    const ok = await install()
    if (ok) toast.success('Application installée')
  }

  async function handleBannerInstall() {
    const ok = await install()
    if (ok) toast.success('Application installée')
  }

  const showTopbarButton = canInstall || isIOS

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
      {showTopbarButton && button}

      {/* Chrome / Android / desktop: native install prompt available */}
      {showPromptBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-immo-accent-green/40 bg-immo-bg-card p-4 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-immo-accent-green/10">
            <Download className="h-5 w-5 text-immo-accent-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">Installer IMMO PRO-X</p>
            <p className="mt-0.5 text-xs text-immo-text-muted">
              Accès rapide, notifications, mode hors-ligne.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleBannerInstall}
                className="rounded-lg bg-immo-accent-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-immo-accent-green/90"
              >
                Installer
              </button>
              <button
                onClick={dismissBanner}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-immo-text-muted hover:text-immo-text-primary"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button onClick={dismissBanner} className="shrink-0 rounded-lg p-1 text-immo-text-muted hover:bg-immo-bg-card-hover">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* iOS Safari: no beforeinstallprompt, must guide user */}
      {showIOSBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-immo-accent-green/40 bg-immo-bg-card p-4 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-immo-accent-green/10">
            <Download className="h-5 w-5 text-immo-accent-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">Installer IMMO PRO-X</p>
            <p className="mt-0.5 text-xs text-immo-text-muted">
              Appuyez sur <Share className="inline h-3.5 w-3.5 -translate-y-px" /> puis
              <span className="font-medium text-immo-text-primary"> « Sur l'écran d'accueil »</span>
            </p>
            <button
              onClick={() => setShowIOSModal(true)}
              className="mt-2 text-xs font-semibold text-immo-accent-green hover:underline"
            >
              Voir les étapes →
            </button>
          </div>
          <button onClick={dismissBanner} className="shrink-0 rounded-lg p-1 text-immo-text-muted hover:bg-immo-bg-card-hover">
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
