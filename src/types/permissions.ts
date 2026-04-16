export type PermissionKey =
  // Dashboard
  | 'dashboard.view' | 'dashboard.view_team'
  // Pipeline
  | 'pipeline.view_own' | 'pipeline.view_all' | 'pipeline.create' | 'pipeline.edit' | 'pipeline.delete' | 'pipeline.change_stage' | 'pipeline.reassign'
  // Projects
  | 'projects.view' | 'projects.create' | 'projects.edit' | 'projects.delete'
  // Units
  | 'units.view' | 'units.create' | 'units.edit' | 'units.delete'
  // Visits
  | 'visits.view_own' | 'visits.view_all' | 'visits.create' | 'visits.edit'
  // Reservations
  | 'reservations.view' | 'reservations.create' | 'reservations.cancel'
  // Sales
  | 'sales.view' | 'sales.create' | 'sales.edit'
  // Dossiers
  | 'dossiers.view' | 'dossiers.export' | 'dossiers.import'
  // Documents
  | 'documents.view' | 'documents.generate' | 'documents.upload' | 'documents.delete'
  // Payments
  | 'payments.view' | 'payments.mark_paid'
  // Goals
  | 'goals.view_own' | 'goals.view_all' | 'goals.create'
  // Performance
  | 'performance.view_own' | 'performance.view_all'
  // Reports
  | 'reports.view' | 'reports.export'
  // Agents
  | 'agents.view' | 'agents.invite' | 'agents.edit' | 'agents.deactivate' | 'agents.permissions'
  // Landing Pages
  | 'landing.view' | 'landing.create' | 'landing.edit' | 'landing.delete'
  // AI
  | 'ai.call_script' | 'ai.suggestions' | 'ai.questions'
  // WhatsApp
  | 'whatsapp.send' | 'whatsapp.view_history'
  // Settings
  | 'settings.view' | 'settings.edit'

export type PermissionMap = Partial<Record<PermissionKey, boolean>>

export interface PermissionProfile {
  id: string
  name: string
  description: string | null
  permissions: PermissionMap
  is_default: boolean
  created_at: string
}

// UI: grouped permissions for the checkbox grid
export const PERMISSION_GROUPS: Array<{
  key: string
  label: string
  permissions: Array<{ key: PermissionKey; label: string }>
}> = [
  {
    key: 'dashboard', label: 'Dashboard',
    permissions: [
      { key: 'dashboard.view', label: 'Voir le dashboard' },
      { key: 'dashboard.view_team', label: 'Voir les stats equipe' },
    ],
  },
  {
    key: 'pipeline', label: 'Pipeline / Clients',
    permissions: [
      { key: 'pipeline.view_own', label: 'Voir ses clients' },
      { key: 'pipeline.view_all', label: 'Voir tous les clients' },
      { key: 'pipeline.create', label: 'Ajouter un client' },
      { key: 'pipeline.edit', label: 'Modifier un client' },
      { key: 'pipeline.delete', label: 'Supprimer un client' },
      { key: 'pipeline.change_stage', label: 'Changer d\'etape' },
      { key: 'pipeline.reassign', label: 'Reassigner un client' },
    ],
  },
  {
    key: 'projects', label: 'Projets',
    permissions: [
      { key: 'projects.view', label: 'Voir les projets' },
      { key: 'projects.create', label: 'Creer un projet' },
      { key: 'projects.edit', label: 'Modifier un projet' },
      { key: 'projects.delete', label: 'Supprimer un projet' },
    ],
  },
  {
    key: 'units', label: 'Biens / Unites',
    permissions: [
      { key: 'units.view', label: 'Voir les biens' },
      { key: 'units.create', label: 'Ajouter un bien' },
      { key: 'units.edit', label: 'Modifier un bien' },
      { key: 'units.delete', label: 'Supprimer un bien' },
    ],
  },
  {
    key: 'visits', label: 'Visites',
    permissions: [
      { key: 'visits.view_own', label: 'Voir ses visites' },
      { key: 'visits.view_all', label: 'Voir toutes les visites' },
      { key: 'visits.create', label: 'Planifier une visite' },
      { key: 'visits.edit', label: 'Modifier une visite' },
    ],
  },
  {
    key: 'reservations', label: 'Reservations',
    permissions: [
      { key: 'reservations.view', label: 'Voir les reservations' },
      { key: 'reservations.create', label: 'Creer une reservation' },
      { key: 'reservations.cancel', label: 'Annuler une reservation' },
    ],
  },
  {
    key: 'sales', label: 'Ventes',
    permissions: [
      { key: 'sales.view', label: 'Voir les ventes' },
      { key: 'sales.create', label: 'Creer une vente' },
      { key: 'sales.edit', label: 'Modifier une vente' },
    ],
  },
  {
    key: 'dossiers', label: 'Dossiers',
    permissions: [
      { key: 'dossiers.view', label: 'Voir les dossiers' },
      { key: 'dossiers.export', label: 'Exporter CSV' },
      { key: 'dossiers.import', label: 'Importer CSV' },
    ],
  },
  {
    key: 'documents', label: 'Documents',
    permissions: [
      { key: 'documents.view', label: 'Voir les documents' },
      { key: 'documents.generate', label: 'Generer un document' },
      { key: 'documents.upload', label: 'Uploader un document' },
      { key: 'documents.delete', label: 'Supprimer un document' },
    ],
  },
  {
    key: 'payments', label: 'Paiements',
    permissions: [
      { key: 'payments.view', label: 'Voir les echeanciers' },
      { key: 'payments.mark_paid', label: 'Marquer paye' },
    ],
  },
  {
    key: 'goals', label: 'Objectifs',
    permissions: [
      { key: 'goals.view_own', label: 'Voir ses objectifs' },
      { key: 'goals.view_all', label: 'Voir tous les objectifs' },
      { key: 'goals.create', label: 'Creer un objectif' },
    ],
  },
  {
    key: 'performance', label: 'Performance',
    permissions: [
      { key: 'performance.view_own', label: 'Voir ses stats' },
      { key: 'performance.view_all', label: 'Voir toutes les stats' },
    ],
  },
  {
    key: 'reports', label: 'Rapports',
    permissions: [
      { key: 'reports.view', label: 'Voir les rapports' },
      { key: 'reports.export', label: 'Exporter les rapports' },
    ],
  },
  {
    key: 'agents', label: 'Gestion Agents',
    permissions: [
      { key: 'agents.view', label: 'Voir les agents' },
      { key: 'agents.invite', label: 'Inviter un agent' },
      { key: 'agents.edit', label: 'Modifier un agent' },
      { key: 'agents.deactivate', label: 'Desactiver un agent' },
      { key: 'agents.permissions', label: 'Gerer les permissions' },
    ],
  },
  {
    key: 'landing', label: 'Pages de capture',
    permissions: [
      { key: 'landing.view', label: 'Voir les landing pages' },
      { key: 'landing.create', label: 'Creer une landing page' },
      { key: 'landing.edit', label: 'Modifier une landing page' },
      { key: 'landing.delete', label: 'Supprimer une landing page' },
    ],
  },
  {
    key: 'ai', label: 'Intelligence Artificielle',
    permissions: [
      { key: 'ai.call_script', label: 'Scripts d\'appel IA' },
      { key: 'ai.suggestions', label: 'Suggestions IA' },
      { key: 'ai.questions', label: 'Questions IA en appel' },
    ],
  },
  {
    key: 'whatsapp', label: 'WhatsApp',
    permissions: [
      { key: 'whatsapp.send', label: 'Envoyer des messages' },
      { key: 'whatsapp.view_history', label: 'Voir l\'historique' },
    ],
  },
  {
    key: 'settings', label: 'Parametres',
    permissions: [
      { key: 'settings.view', label: 'Voir les parametres' },
      { key: 'settings.edit', label: 'Modifier les parametres' },
    ],
  },
]
