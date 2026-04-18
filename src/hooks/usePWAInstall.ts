import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

const DISMISS_KEY = 'pwa-install-dismissed-at'
// Re-show the banner 3 days after a dismissal so users aren't pestered
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3

function wasDismissedRecently() {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
  return at > 0 && Date.now() - at < DISMISS_COOLDOWN_MS
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const [showPromptBanner, setShowPromptBanner] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode()) {
      setIsInstalled(true)
      return
    }

    if (isIOS()) {
      if (!wasDismissedRecently()) setShowIOSBanner(true)
      return
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!wasDismissedRecently()) setShowPromptBanner(true)
    }

    function onInstalled() {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowPromptBanner(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowPromptBanner(false)
    return outcome === 'accepted'
  }, [deferredPrompt])

  const dismissBanner = useCallback(() => {
    setShowIOSBanner(false)
    setShowPromptBanner(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }, [])

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS: isIOS() && !isInStandaloneMode(),
    showIOSBanner,
    showPromptBanner,
    dismissBanner,
    install,
  }
}
