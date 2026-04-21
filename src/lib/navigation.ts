import type { UserRole } from '@/types'
import type { PermissionKey } from '@/types/permissions'

export interface NavItem {
  label: string
  path: string
  icon: string
  roles: UserRole[] | 'all'
  requiredPermission?: PermissionKey
}

// "all" historically meant "every non-admin role sees this" — i.e. agents.
// With the reception role added, we keep that meaning (agent + admin) and
// wire reception-specific items explicitly. Reception users see the
// /reception hub only — dispatch is their sole responsibility.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Reception', path: '/reception', icon: 'UserPlus', roles: ['reception', 'admin'] },
  { label: "À faire", path: '/today', icon: 'CheckSquare', roles: ['agent', 'admin'] },
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: 'all', requiredPermission: 'dashboard.view' },
  { label: 'Projets', path: '/projects', icon: 'Building2', roles: ['agent', 'admin'], requiredPermission: 'projects.view' },
  { label: 'Pipeline', path: '/pipeline', icon: 'GitBranch', roles: 'all', requiredPermission: 'pipeline.view_own' },
  { label: 'Taches', path: '/tasks', icon: 'CheckSquare', roles: 'all' },
  { label: 'Planning', path: '/planning', icon: 'Calendar', roles: 'all', requiredPermission: 'visits.view_own' },
  { label: 'Dossiers', path: '/dossiers', icon: 'FolderOpen', roles: 'all', requiredPermission: 'dossiers.view' },
  { label: 'Objectifs', path: '/goals', icon: 'Target', roles: 'all', requiredPermission: 'goals.view_own' },
  { label: 'Performance', path: '/performance', icon: 'TrendingUp', roles: 'all', requiredPermission: 'performance.view_own' },
  { label: 'Agents', path: '/agents', icon: 'Users', roles: ['admin'], requiredPermission: 'agents.view' },
  { label: "Journal d'activité", path: '/activity-log', icon: 'Activity', roles: ['admin'] },
  { label: 'Rapports', path: '/reports', icon: 'BarChart3', roles: ['admin'], requiredPermission: 'reports.view' },
  { label: 'ROI Marketing', path: '/marketing-roi', icon: 'Target', roles: ['admin'] },
  { label: 'Paramètres', path: '/settings', icon: 'Settings', roles: ['admin'], requiredPermission: 'settings.view' },
  { label: 'Mon profil', path: '/profile', icon: 'UserCircle', roles: ['agent', 'admin', 'reception'] },
]

export function getVisibleNavItems(
  role: UserRole | null,
  can?: (permission: PermissionKey) => boolean,
): NavItem[] {
  if (!role) return []
  // Admin sees everything
  if (role === 'admin') {
    return NAV_ITEMS
  }
  // Filter for non-admin roles
  return NAV_ITEMS.filter((item) => {
    // 1. Role restriction: skip items that don't include this role.
    //    'all' is legacy shorthand for agent-scoped visibility; reception
    //    gets only items that list it explicitly.
    if (item.roles === 'all') {
      if (role !== 'agent') return false
    } else if (!item.roles.includes(role)) {
      return false
    }
    // 2. Permission requirement: if a permission is required, check it
    if (item.requiredPermission && can) {
      return can(item.requiredPermission)
    }
    return true
  })
}
