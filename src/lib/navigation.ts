import type { UserRole } from '@/types'
import type { PermissionKey } from '@/types/permissions'

export interface NavItem {
  label: string
  path: string
  icon: string
  roles: UserRole[] | 'all'
  requiredPermission?: PermissionKey
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: 'all', requiredPermission: 'dashboard.view' },
  { label: 'Projets', path: '/projects', icon: 'Building2', roles: ['admin', 'agent'], requiredPermission: 'projects.view' },
  { label: 'Pipeline', path: '/pipeline', icon: 'GitBranch', roles: ['admin', 'agent', 'reception'], requiredPermission: 'pipeline.view_own' },
  { label: 'Taches', path: '/tasks', icon: 'CheckSquare', roles: ['admin', 'agent'] },
  { label: 'Planning', path: '/planning', icon: 'Calendar', roles: ['admin', 'agent', 'reception'], requiredPermission: 'visits.view_own' },
  { label: 'Dossiers', path: '/dossiers', icon: 'FolderOpen', roles: ['admin', 'agent'], requiredPermission: 'dossiers.view' },
  { label: 'Objectifs', path: '/goals', icon: 'Target', roles: ['admin', 'agent'], requiredPermission: 'goals.view_own' },
  { label: 'Performance', path: '/performance', icon: 'TrendingUp', roles: ['admin', 'agent'], requiredPermission: 'performance.view_own' },
  { label: 'Agents', path: '/agents', icon: 'Users', roles: ['admin'], requiredPermission: 'agents.view' },
  { label: 'Rapports', path: '/reports', icon: 'BarChart3', roles: ['admin'], requiredPermission: 'reports.view' },
  { label: 'ROI Marketing', path: '/marketing-roi', icon: 'Target', roles: ['admin'] },
  { label: 'Paramètres', path: '/settings', icon: 'Settings', roles: ['admin'], requiredPermission: 'settings.view' },
]

export function getVisibleNavItems(
  role: UserRole | null,
  can?: (permission: PermissionKey) => boolean,
): NavItem[] {
  if (!role) return []
  // Admin bypass — sees everything
  if (role === 'admin' || role === 'super_admin') return NAV_ITEMS

  return NAV_ITEMS.filter((item) => {
    // Role gate first
    if (item.roles !== 'all' && !item.roles.includes(role)) return false
    // Permission gate (if any)
    if (!item.requiredPermission) return true
    return can ? can(item.requiredPermission) : true
  })
}
