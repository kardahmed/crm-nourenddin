import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Handles tab/page resume on iOS Safari and other browsers.
 *
 * Without this, switching to another app (YouTube, Insta) and returning
 * leaves the page in a bfcache-restored state where:
 *   - Supabase's WebSocket/connection may be dead
 *   - In-flight queries hang forever (iOS kills background requests)
 *   - The UI can appear frozen or stuck in a loading state
 *
 * We listen for `pageshow` (bfcache restore) and `visibilitychange`
 * (tab refocus) and:
 *   1. Ask Supabase to refresh the session — revives the auth client
 *   2. Invalidate React Query cache — triggers fresh fetches
 *
 * No full page reload is needed.
 */
export function useTabVisibility() {
  const qc = useQueryClient()

  useEffect(() => {
    let lastResumeAt = 0

    async function onResume(reason: string) {
      const now = Date.now()
      // Debounce — don't resume twice within 500ms
      if (now - lastResumeAt < 500) return
      lastResumeAt = now

      // Ping supabase to rehydrate session and refresh token if expired.
      // Failures are non-blocking (network blip on tab resume) but we log
      // them in dev so a dead session is easier to diagnose.
      supabase.auth.getSession().catch((err) => {
        if (import.meta.env.DEV) console.warn('[Tab] getSession on resume failed', err)
      })

      // Mark all queries stale so mounted components refetch lazily
      qc.invalidateQueries({ type: 'active' })

      if (import.meta.env.DEV) console.log('[Tab] resumed via', reason)
    }

    function onPageShow(e: PageTransitionEvent) {
      // bfcache restore — page was suspended and restored
      if (e.persisted) onResume('bfcache')
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') onResume('visibility')
    }

    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [qc])
}
