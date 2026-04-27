import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileSidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { OnboardingWizard } from '@/components/common/OnboardingWizard'
import { CommandPalette } from '@/components/CommandPalette'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useMobile } from '@/hooks/useMobile'
import { useAuthStore } from '@/store/authStore'

export function AppLayout() {
  const { title, subtitle } = usePageMeta()
  const { isMobile } = useMobile()
  const role = useAuthStore((s) => s.role)
  const location = useLocation()
  useKeyboardShortcuts()
  usePushNotifications()

  return (
    <div className="flex h-screen overflow-hidden bg-immo-bg-primary">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}
      {/* Mobile drawer sidebar */}
      {isMobile && <MobileSidebar />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} subtitle={subtitle} />
        <main
          className="flex-1 overflow-y-auto p-3 md:p-6"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          }}
        >
          {role === 'admin' && <OnboardingWizard />}
          {/* Per-route ErrorBoundary: a page crash only takes down the main
              content; sidebar/topbar/command palette stay usable. The key
              forces a reset when the user navigates elsewhere. */}
          <ErrorBoundary key={location.pathname}>
            <div className="animate-in fade-in duration-200">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
