import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

// Race a thenable against a timeout. Supabase builders are thenable but not
// actual Promises, so we accept PromiseLike here. Prevents any individual
// query from hanging the auth flow (RLS deadlock, network stall, SW caching).
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[Auth] ${label} timeout after ${ms}ms`)), ms),
    ),
  ])
}

export function useAuth() {
  const {
    session,
    userProfile,
    role,
    isLoading,
    setSession,
    setUserProfile,
    setPermissionProfile,
    setLoading,
    reset,
  } = useAuthStore()

  // Effect 1: Listen to auth state changes (sync only — no await)
  useEffect(() => {
    let settled = false
    function finishInit() {
      if (settled) return
      settled = true
      // Let effect 2 handle loading=false once profile is loaded.
      // This only fires the "no session" branch below.
    }

    // Get initial session — always unblock the spinner, even if there's no session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (!s) setLoading(false)
      finishInit()
    }).catch(() => {
      // Network/client error — unblock UI so user can at least retry
      setLoading(false)
      finishInit()
    })

    // Safety: if getSession never resolves (iOS bfcache edge case), unblock after 8s
    const timer = setTimeout(() => {
      if (!settled) {
        console.warn('[Auth] getSession timeout — unblocking UI')
        setLoading(false)
        finishInit()
      }
    }, 8000)

    // Listen for changes.
    // IMPORTANT: don't set loading=true on SIGNED_IN/TOKEN_REFRESHED — those fire
    // every time iOS Safari wakes the tab and would re-trigger the spinner.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s)
        if (event === 'SIGNED_OUT') {
          reset()
        }
      },
    )

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [setSession, setLoading, reset])

  // Effect 2: When session changes, load the user profile.
  // Only re-fetch when the user ID actually changed (token refresh keeps same id,
  // so this effect doesn't re-run — meaning tab resume stays silent).
  useEffect(() => {
    if (!session?.user) return

    let cancelled = false
    const userId = session.user.id

    // Fresh sign-in (or initial mount): gate redirects until profile loads.
    // Token refreshes keep the same user.id so this effect doesn't re-fire,
    // which means we never toggle the spinner during a tab resume.
    setLoading(true)

    // Global safety net — guarantees the UI unblocks even in the pathological
    // case where BOTH queries AND Promise.race somehow fail to settle.
    const globalTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] Global timeout — unblocking UI')
        setLoading(false)
      }
    }, 8000)

    async function loadProfile() {
      console.log('[Auth] Loading profile for', userId)
      try {
        // Per-query timeout so a hung request can't freeze the flow.
        const { data, error } = await withTimeout(
          supabase.from('users').select('*').eq('id', userId).maybeSingle(),
          5000,
          'users query',
        )

        if (cancelled) return
        console.log('[Auth] Users query done', { hasData: !!data, hasError: !!error })

        if (error) {
          console.error('[Auth] Profile error:', error.message)
          setUserProfile(null)
          setLoading(false)
          clearTimeout(globalTimeout)
          return
        }

        if (!data) {
          console.warn('[Auth] No users row for id', userId)
          setUserProfile(null)
          setLoading(false)
          clearTimeout(globalTimeout)
          return
        }

        const profile = data as User

        if (profile.status === 'inactive') {
          setLoading(false)
          clearTimeout(globalTimeout)
          await supabase.auth.signOut()
          reset()
          return
        }

        setUserProfile(profile)

        // Release the spinner now — permission profile load runs in background.
        // Agents without a permission profile still get sensible defaults via
        // the permission_profile fallback in usePermissions.
        setLoading(false)
        clearTimeout(globalTimeout)
        console.log('[Auth] Spinner released')

        const profileId = (profile as unknown as { permission_profile_id: string | null }).permission_profile_id
        if (profile.role === 'agent' && profileId) {
          try {
            const { data: permProfile, error: permErr } = await withTimeout(
              supabase.from('permission_profiles').select('*').eq('id', profileId).maybeSingle(),
              5000,
              'permission_profiles query',
            )
            if (permErr) console.warn('[Auth] Permission profile error:', permErr.message)
            if (!cancelled) {
              setPermissionProfile(permProfile
                ? (permProfile as unknown as import('@/types/permissions').PermissionProfile)
                : null)
            }
          } catch (permCatch) {
            console.warn('[Auth] Permission profile exception:', permCatch)
            if (!cancelled) setPermissionProfile(null)
          }
        } else {
          setPermissionProfile(null)
        }
      } catch (err) {
        console.error('[Auth] Profile exception:', err)
        if (!cancelled) {
          setUserProfile(null)
          setLoading(false)
        }
        clearTimeout(globalTimeout)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
      clearTimeout(globalTimeout)
    }
  }, [session?.user?.id, setUserProfile, setPermissionProfile, setLoading, reset])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email ou mot de passe incorrect')
      }
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    reset()
  }, [reset])

  return {
    user: session?.user ?? null,
    userProfile,
    role,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  }
}
