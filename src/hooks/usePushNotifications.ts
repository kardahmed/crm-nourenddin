import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * Local Web Notifications + optional true Web Push.
 *
 * Two modes live here:
 *   1. Local notifications (always on). Calling `sendPush(title, body)` fires
 *      a browser Notification while the app is open. Works without server
 *      infra and is what the app uses today for in-app alerts.
 *   2. True Web Push (opt-in, requires VITE_VAPID_PUBLIC_KEY). When the user
 *      grants permission, we subscribe via the service worker's pushManager
 *      and upsert the subscription in `public.push_subscriptions`. An edge
 *      function (see `supabase/functions/send-push`) is expected to fan out
 *      notifications via the web-push protocol. Without the VAPID key the
 *      subscribe step is skipped gracefully.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export function usePushNotifications() {
  const userId = useAuthStore(s => s.session?.user?.id)
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const [webPushReady, setWebPushReady] = useState(false)

  const isSupported = typeof window !== 'undefined' && 'Notification' in window
  const canWebPush = isSupported && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY

  const subscribeWebPush = useCallback(async () => {
    if (!canWebPush || !userId) return
    try {
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
        })
      }
      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh'))
      const auth = arrayBufferToBase64(subscription.getKey('auth'))
      // When the same browser is re-used by a different user (logout/login),
      // the endpoint row already exists under the previous user_id and RLS
      // blocks upsert-on-conflict (UPDATE denied). Delete first (reclaim policy
      // in migration 030 lets any authed user wipe the stale row), then INSERT.
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => { eq: (c: string, v: string) => Promise<unknown> }
          insert: (row: Record<string, unknown>) => Promise<unknown>
        }
      }
      await sb.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      await sb.from('push_subscriptions').insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      })
      setWebPushReady(true)
    } catch (err) {
      console.warn('Push subscription failed', err)
      setWebPushReady(false)
    }
  }, [canWebPush, userId])

  const enablePush = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermission
    let perm = Notification.permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
      setPermission(perm)
    }
    if (perm === 'granted') await subscribeWebPush()
    return perm
  }, [isSupported, subscribeWebPush])

  useEffect(() => {
    if (!isSupported) return
    // Best-effort: if permission already granted from a previous visit,
    // make sure this browser's subscription is stored on the current user.
    if (Notification.permission === 'granted' && userId) subscribeWebPush()
  }, [isSupported, userId, subscribeWebPush])

  const sendPush = useCallback(
    (title: string, body?: string, url?: string) => {
      if (!isSupported || Notification.permission !== 'granted') return
      const notif = new Notification(title, {
        body,
        icon: '/logo-180.png',
        badge: '/favicon.png',
        tag: 'immo-prox',
        silent: false,
      })
      if (url) {
        notif.onclick = () => {
          window.focus()
          window.location.href = url
        }
      }
    },
    [isSupported],
  )

  return {
    isSupported,
    permission,
    webPushReady,
    canWebPush,
    enablePush,
    sendPush,
  }
}
