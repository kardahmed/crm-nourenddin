import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as User
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

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        if (!mounted) return

        if (profile?.status === 'inactive') {
          await supabase.auth.signOut()
          reset()
          return
        }
        setUserProfile(profile)
      }

      if (mounted) setLoading(false)
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        setSession(session)

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          if (!mounted) return

          if (profile?.status === 'inactive') {
            await supabase.auth.signOut()
            reset()
            return
          }
          setUserProfile(profile)
          setLoading(false)
        }

        if (event === 'SIGNED_OUT') {
          reset()
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

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

  // profileReady = true when either:
  // - not authenticated (no profile needed)
  // - profile is loaded (role is set)
  const isAuthenticated = !!session
  const profileReady = !isAuthenticated || role !== null

  return {
    user: session?.user ?? null,
    userProfile,
    role,
    tenantId,
    // isLoading is true until BOTH session check AND profile fetch are done
    isLoading: isLoading || (isAuthenticated && !profileReady),
    isAuthenticated,
    signIn,
    signOut,
  }
}
