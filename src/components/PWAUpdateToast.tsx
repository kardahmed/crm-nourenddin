import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Listens to the service worker lifecycle and shows a toast when a
 * new build is ready. Clicking "Recharger" calls the workbox helper
 * that skips-waiting the new SW and reloads — users control when.
 *
 * Mounted once at the app root. Nothing to render.
 */
export function PWAUpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      // Check for updates every hour for long-lived sessions
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 60 * 1000)

      // Also check when the tab becomes visible (user comes back after
      // switching to another app). This way a fresh deploy is picked up
      // within seconds instead of waiting for the hourly poll.
      function onVisibility() {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {})
        }
      }
      document.addEventListener('visibilitychange', onVisibility)
    },
  })

  useEffect(() => {
    if (offlineReady) {
      toast.success('Application prête à fonctionner hors-ligne', {
        duration: 4000,
        icon: <CheckCircle2 className="h-4 w-4 text-immo-accent-green" />,
      })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (!needRefresh) return
    const id = toast.custom(
      (t) => (
        <div
          className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-immo-accent-green/40 bg-immo-bg-card p-3 shadow-lg ${
            t.visible ? 'animate-in slide-in-from-top-2' : 'animate-out'
          }`}
        >
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-immo-accent-green" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-immo-text-primary">
              Nouvelle version disponible
            </div>
            <div className="mt-0.5 text-[11px] text-immo-text-muted">
              Recharge pour profiter des dernières améliorations.
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button
              onClick={() => {
                updateServiceWorker(true)
              }}
              className="rounded-md bg-immo-accent-green px-3 py-1 text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
            >
              Recharger
            </button>
            <button
              onClick={() => {
                setNeedRefresh(false)
                toast.dismiss(t.id)
              }}
              className="rounded-md px-3 py-1 text-[11px] font-medium text-immo-text-muted hover:text-immo-text-primary"
            >
              Plus tard
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-right' },
    )
    return () => {
      toast.dismiss(id)
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
