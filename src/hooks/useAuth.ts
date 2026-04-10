import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

async function fetchUserProfile(userId: string): Promise<User | null> {
  try {
    console.log('[Auth] Fetching profile for', userId)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Profile fetch error:', error.message)
      return null
    }
    console.log('[Auth] Profile OK — role:', data.role, 'tenant:', data.tenant_id)
    return data as User
  } catch (err) {
    console.error('[Auth] Profile exception:', err)
    return null
  }
}

export function useAuth() {
  const {
    session,
    userProfile,
    role,
    tenantId,
    isLoading,
    setSession,
    setUserProfile,
    setLoading,
    reset,
  } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let profileLoaded = false

    async function loadProfile(userId: string) {
      if (profileLoaded) return
      profileLoaded = true

      const profile = await fetchUserProfile(userId)
      if (!mounted) return

      if (profile?.status === 'inactive') {
        await supabase.auth.signOut()
        reset()
        return
      }

      setUserProfile(profile)
      setLoading(false)
      console.log('[Auth] State set — loading=false, role=', profile?.role ?? 'null')
    }

    async function init() {
      console.log('[Auth] init')
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!mounted) return

      if (s?.user) {
        setSession(s)
        await loadProfile(s.user.id)
      } else {
        setSession(null)
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return
        console.log('[Auth] event:', event)

        if (event === 'SIGNED_OUT') { reset(); return }
        if (event === 'TOKEN_REFRESHED' && s) { setSession(s); return }

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s?.user) {
          setSession(s)
          await loadProfile(s.user.id)
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setSession, setUserProfile, setLoading, reset])

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
    tenantId,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  }
}
