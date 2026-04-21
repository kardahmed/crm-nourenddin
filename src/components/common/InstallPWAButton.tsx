import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Share, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePWAInstall } from '@/hooks/usePWAInstall'

interface InstallPWAButtonProps {
  variant?: 'icon' | 'full'
  className?: string
}

export function InstallPWAButton({ variant = 'icon', className = '' }: InstallPWAButtonProps) {
  const { t } = useTranslation()
  const { canInstall, isIOS, showIOSBanner, showPromptBanner, dismissBanner, install } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  async function handleClick() {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }
    const ok = await install()
    if (ok) toast.success(t('pwa.app_installed'))
  }

  async function handleBannerInstall() {
    const ok = await install()
    if (ok) toast.success(t('pwa.app_installed'))
  }

  const showTopbarButton = canInstall || isIOS

  const button = variant === 'full' ? (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 rounded-lg bg-immo-accent-green px-3 py-2 text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90 ${className}`}
    >
      <Download className="h-4 w-4" />
      <span>{t('pwa.install_app')}</span>
    </button>
  ) : (
    <button
      onClick={handleClick}
      title={t('pwa.install_app')}
      className={`rounded-lg p-2 text-immo-text-muted transition-colors hover:bg-immo-bg-card-hover hover:text-immo-accent-green ${className}`}
    >
      <Download className="h-4 w-4" />
    </button>
  )

  return (
    <>
      {showTopbarButton && button}

      {showPromptBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-immo-accent-green/40 bg-immo-bg-card p-4 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-immo-accent-green/10">
            <Download className="h-5 w-5 text-immo-accent-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">{t('pwa.banner_title')}</p>
            <p className="mt-0.5 text-xs text-immo-text-muted">
              {t('pwa.banner_desc')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleBannerInstall}
                className="rounded-lg bg-immo-accent-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-immo-accent-green/90"
              >
                {t('pwa.install')}
              </button>
              <button
                onClick={dismissBanner}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-immo-text-muted hover:text-immo-text-primary"
              >
                {t('pwa.later')}
              </button>
            </div>
          </div>
          <button onClick={dismissBanner} className="shrink-0 rounded-lg p-1 text-immo-text-muted hover:bg-immo-bg-card-hover">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showIOSBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-immo-accent-green/40 bg-immo-bg-card p-4 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-immo-accent-green/10">
            <Download className="h-5 w-5 text-immo-accent-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">{t('pwa.banner_title')}</p>
            <p className="mt-0.5 text-xs text-immo-text-muted">
              {t('pwa.ios_hint_prefix')} <Share className="inline h-3.5 w-3.5 -translate-y-px" /> {t('pwa.ios_hint_middle')}
              <span className="font-medium text-immo-text-primary"> {t('pwa.ios_hint_action')}</span>
            </p>
            <button
              onClick={() => setShowIOSModal(true)}
              className="mt-2 text-xs font-semibold text-immo-accent-green hover:underline"
            >
              {t('pwa.see_steps')}
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
            <h3 className="text-base font-bold text-immo-text-primary">{t('pwa.install_app')}</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-immo-accent-blue/10 text-sm font-bold text-immo-accent-blue">1</div>
                <p className="text-sm text-immo-text-secondary">
                  {t('pwa.ios_step1_prefix')} <Share className="inline h-4 w-4 -translate-y-px text-immo-accent-blue" /> {t('pwa.ios_step1_suffix')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-immo-accent-blue/10 text-sm font-bold text-immo-accent-blue">2</div>
                <p className="text-sm text-immo-text-secondary">
                  {t('pwa.ios_step2_prefix')} <Plus className="inline h-4 w-4 -translate-y-px" /> <span className="font-medium text-immo-text-primary">{t('pwa.ios_step2_suffix')}</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-immo-accent-blue/10 text-sm font-bold text-immo-accent-blue">3</div>
                <p className="text-sm text-immo-text-secondary">
                  {t('pwa.ios_step3_prefix')} <span className="font-medium text-immo-text-primary">{t('pwa.ios_step3_suffix')}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-immo-accent-green py-2.5 text-sm font-semibold text-white hover:bg-immo-accent-green/90"
            >
              {t('pwa.got_it')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
