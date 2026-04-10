import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

async function fetchUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Profile fetch error:', error.message)
      return null
    }
    console.log('[Auth] Profile loaded — role:', data.role)
    return data as User
  } catch (err) {
    console.error('[Auth] Profile fetch exception:', err)
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

  const fetchingRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function loadProfile(userId: string) {
      // Prevent concurrent profile fetches
      if (fetchingRef.current) return
      fetchingRef.current = true

      console.log('[Auth] Loading profile for', userId)
      const profile = await fetchUserProfile(userId)

      if (!mounted) { fetchingRef.current = false; return }

      if (profile?.status === 'inactive') {
        console.log('[Auth] User inactive, signing out')
        await supabase.auth.signOut()
        reset()
        fetchingRef.current = false
        return
      }

      setUserProfile(profile) // profile may be null (RLS issue)
      setLoading(false)
      fetchingRef.current = false
      console.log('[Auth] Done — loading=false, role=', profile?.role ?? 'null')
    }

    async function init() {
      console.log('[Auth] init start')
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (!mounted) return

      if (currentSession?.user) {
        setSession(currentSession)
        await loadProfile(currentSession.user.id)
      } else {
        setSession(null)
        setLoading(false)
        console.log('[Auth] No session, loading=false')
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        console.log('[Auth] authStateChange:', event)

        if (event === 'SIGNED_OUT') {
          reset()
          return
        }

        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession)
          await loadProfile(newSession.user.id)
        }

        if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession)
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setSession, setUserProfile, setLoading, reset])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou mot de passe incorrect')
        }
        throw new Error(error.message)
      }
    },
    [],
  )

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
