import { useAuthStore } from '@/store/authStore'

export function useTenant() {
  const tenantId = useAuthStore((s) => s.tenantId)

  if (!tenantId) {
    throw new Error('useTenant must be used within an authenticated context')
  }

  return tenantId
}
