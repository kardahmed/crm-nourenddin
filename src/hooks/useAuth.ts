import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

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
  // Only re-fetch when the user ID actually changed (token refresh keeps same id).
  useEffect(() => {
    if (!session?.user) return

    let cancelled = false
    const userId = session.user.id

    // Safety timeout — if Supabase hangs after tab resume on iOS, unblock after 10s
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] Profile fetch timeout — unblocking UI')
        setLoading(false)
      }
    }, 10000)

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (cancelled) return
        clearTimeout(timeoutId)

        if (error) {
          console.error('[Auth] Profile error:', error.message)
          setUserProfile(null)
          setLoading(false)
          return
        }

        const profile = data as User

        if (profile.status === 'inactive') {
          await supabase.auth.signOut()
          reset()
          return
        }

        setUserProfile(profile)

        // Load permission profile for agents
        const profileId = (profile as unknown as { permission_profile_id: string | null }).permission_profile_id
        if (profile.role === 'agent' && profileId) {
          const { data: permProfile } = await supabase
            .from('permission_profiles')
            .select('*')
            .eq('id', profileId)
            .single()
          if (!cancelled && permProfile) {
            setPermissionProfile(permProfile as unknown as import('@/types/permissions').PermissionProfile)
          }
        } else {
          setPermissionProfile(null)
        }

        setLoading(false)
      } catch (err) {
        console.error('[Auth] Profile exception:', err)
        clearTimeout(timeoutId)
        if (!cancelled) {
          setUserProfile(null)
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
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
