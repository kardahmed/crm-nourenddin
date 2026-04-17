// Re-export tous les types de la base de données
export type {
  Database,
  Tenant,
  User,
  Project,
  Unit,
  Client,
  Visit,
  Reservation,
  Sale,
  PaymentSchedule,
  Charge,
  SaleAmenity,
  History,
  Task,
  Document,
  AgentGoal,
  TenantSettings,
  DocumentTemplate,
  UserRole,
  UserStatus,
  ProjectStatus,
  UnitType,
  UnitSubtype,
  UnitStatus,
  PipelineStage,
  ClientSource,
  ClientType,
  InterestLevel,
  PaymentMethod,
  VisitType,
  VisitStatus,
  DepositMethod,
  ReservationStatus,
  FinancingMode,
  DiscountType,
  SaleStatus,
  PaymentStatus,
  ChargeType,
  HistoryType,
  TaskType,
  TaskStatus,
  DocType,
  GoalMetric,
  GoalPeriod,
  GoalStatus,
} from './database'

import type { PipelineStage, ClientSource, UnitStatus, UnitType, UnitSubtype, HistoryType, VisitStatus, PaymentStatus, GoalMetric, InterestLevel, PaymentMethod, FinancingMode, ReservationStatus, UserRole } from './database'

// ─── Pipeline Stages ───

export const PIPELINE_STAGES: Record<PipelineStage, { label: string; color: string }> = {
  accueil: { label: 'Accueil', color: '#7F96B7' },
  visite_a_gerer: { label: 'Visite à gérer', color: '#FF9A1E' },
  visite_confirmee: { label: 'Visite confirmée', color: '#3782FF' },
  visite_terminee: { label: 'Visite terminée', color: '#A855F7' },
  negociation: { label: 'Négociation', color: '#EAB308' },
  reservation: { label: 'Réservation', color: '#06B6D4' },
  vente: { label: 'Vente', color: '#00D4A0' },
  relancement: { label: 'Relancement', color: '#F97316' },
  perdue: { label: 'Perdue', color: '#FF4949' },
}

// ─── Client Sources ───

export const SOURCE_LABELS: Record<ClientSource, string> = {
  facebook_ads: 'Facebook Ads',
  google_ads: 'Google Ads',
  instagram_ads: 'Instagram Ads',
  appel_entrant: 'Appel entrant',
  reception: 'Réception',
  bouche_a_oreille: 'Bouche à oreille',
  reference_client: 'Référence client',
  site_web: 'Site web',
  portail_immobilier: 'Portail immobilier',
  autre: 'Autre',
}

// ─── Unit Status ───

export const UNIT_STATUS_LABELS: Record<UnitStatus, { label: string; color: string }> = {
  available: { label: 'Disponible', color: '#00D4A0' },
  reserved: { label: 'Réservé', color: '#FF9A1E' },
  sold: { label: 'Vendu', color: '#3782FF' },
  blocked: { label: 'Bloqué', color: '#FF4949' },
}

// ─── Unit Types ───

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  apartment: 'Appartement',
  local: 'Local commercial',
  villa: 'Villa',
  parking: 'Parking',
}

// ─── Unit Subtypes ───

export const UNIT_SUBTYPE_LABELS: Record<UnitSubtype, string> = {
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
}

// ─── History Types ───

export const HISTORY_TYPE_LABELS: Record<HistoryType, { label: string; icon: string }> = {
  stage_change: { label: 'Changement d\'étape', icon: 'ArrowRightLeft' },
  visit_planned: { label: 'Visite planifiée', icon: 'CalendarPlus' },
  visit_confirmed: { label: 'Visite confirmée', icon: 'CalendarCheck' },
  visit_completed: { label: 'Visite terminée', icon: 'CheckCircle' },
  call: { label: 'Appel', icon: 'Phone' },
  whatsapp_call: { label: 'Appel WhatsApp', icon: 'PhoneCall' },
  whatsapp_message: { label: 'Message WhatsApp', icon: 'MessageCircle' },
  sms: { label: 'SMS', icon: 'MessageSquare' },
  email: { label: 'Email', icon: 'Mail' },
  reservation: { label: 'Réservation', icon: 'Bookmark' },
  sale: { label: 'Vente', icon: 'BadgeDollarSign' },
  payment: { label: 'Paiement', icon: 'CreditCard' },
  document: { label: 'Document', icon: 'FileText' },
  note: { label: 'Note', icon: 'StickyNote' },
  ai_task: { label: 'Tâche IA', icon: 'Bot' },
  client_created: { label: 'Client créé', icon: 'UserPlus' },
  reassignment: { label: 'Réassignation', icon: 'UserCheck' },
  priority_change: { label: 'Priorité', icon: 'Star' },
  budget_change: { label: 'Budget mis à jour', icon: 'DollarSign' },
}

// ─── Visit Status ───

export const VISIT_STATUS_LABELS: Record<VisitStatus, { label: string; color: string }> = {
  planned: { label: 'Planifiée', color: '#3782FF' },
  confirmed: { label: 'Confirmée', color: '#00D4A0' },
  completed: { label: 'Terminée', color: '#7F96B7' },
  cancelled: { label: 'Annulée', color: '#FF4949' },
  rescheduled: { label: 'Reportée', color: '#FF9A1E' },
}

// ─── Payment Status ───

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#FF9A1E' },
  paid: { label: 'Payé', color: '#00D4A0' },
  late: { label: 'En retard', color: '#FF4949' },
}

// ─── Goal Metrics ───

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  sales_count: 'Nombre de ventes',
  reservations_count: 'Nombre de réservations',
  visits_count: 'Nombre de visites',
  revenue: 'Chiffre d\'affaires',
  new_clients: 'Nouveaux clients',
  conversion_rate: 'Taux de conversion',
}

// ─── Interest Level ───

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, { label: string; color: string }> = {
  low: { label: 'Faible', color: '#7F96B7' },
  medium: { label: 'Moyen', color: '#FF9A1E' },
  high: { label: 'Élevé', color: '#00D4A0' },
}

// ─── Payment Method ───

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  comptant: 'Comptant',
  credit: 'Crédit bancaire',
  lpp: 'LPP',
  aadl: 'AADL',
  mixte: 'Mixte',
}

// ─── Financing Mode ───

export const FINANCING_MODE_LABELS: Record<FinancingMode, string> = {
  comptant: 'Comptant',
  credit: 'Crédit',
  mixte: 'Mixte',
}

// ─── Reservation Status ───

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#00D4A0' },
  expired: { label: 'Expirée', color: '#FF9A1E' },
  cancelled: { label: 'Annulée', color: '#FF4949' },
  converted: { label: 'Convertie en vente', color: '#3782FF' },
}

// ─── User Roles ───

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  agent: 'Agent commercial',
}
