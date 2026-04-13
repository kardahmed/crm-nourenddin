import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { User, UserRole } from '@/types'
import type { PermissionProfile } from '@/types/permissions'

interface AuthState {
  session: Session | null
  userProfile: User | null
  role: UserRole | null
  tenantId: string | null
  permissionProfile: PermissionProfile | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  setUserProfile: (profile: User | null) => void
  setPermissionProfile: (profile: PermissionProfile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  userProfile: null,
  role: null,
  tenantId: null,
  permissionProfile: null,
  isLoading: true,

  setSession: (session) => set({ session }),

  setUserProfile: (profile) =>
    set({
      userProfile: profile,
      role: profile?.role ?? null,
      tenantId: profile?.tenant_id ?? null,
    }),

  setPermissionProfile: (profile) => set({ permissionProfile: profile }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      session: null,
      userProfile: null,
      role: null,
      tenantId: null,
      permissionProfile: null,
      isLoading: false,
    }),
}))
