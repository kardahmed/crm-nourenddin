import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Search,
  Phone,
  Building2,
  Users as UsersIcon,
  Globe,
  Home,
  Megaphone,
  UserCheck,
  HelpCircle,
  GripVertical,
  Share2,
  Image,
} from 'lucide-react'
import { SOURCE_LABELS } from '@/types'
import type { ClientSource } from '@/types'

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook_ads: Share2,
  google_ads: Search,
  instagram_ads: Image,
  appel_entrant: Phone,
  reception: Building2,
  bouche_a_oreille: UsersIcon,
  reference_client: UserCheck,
  site_web: Globe,
  portail_immobilier: Home,
  autre: Megaphone,
}

// Derive a stable color from the client name
function nameToColor(name: string): string {
  const COLORS = [
    '#00D4A0', '#3782FF', '#FF9A1E', '#A855F7',
    '#06B6D4', '#EAB308', '#F97316', '#EC4899',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export interface KanbanCardClient {
  id: string
  full_name: string
  phone: string
  source: string
  agent_name: string | null
  project_name: string | null
  created_at: string
  days_in_stage: number
  is_urgent: boolean
}

interface KanbanCardProps {
  client: KanbanCardClient
  urgentDays: number
  isDragging?: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

export function KanbanCard({
  client,
  urgentDays,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const navigate = useNavigate()

  const color = useMemo(() => nameToColor(client.full_name), [client.full_name])
  const initials = useMemo(() => getInitials(client.full_name), [client.full_name])
  const SourceIcon = SOURCE_ICONS[client.source] ?? HelpCircle
  const daysOverdue = client.days_in_stage > urgentDays

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/pipeline/clients/${client.id}`)}
      className={`group relative cursor-pointer rounded-lg border bg-immo-bg-card p-3 transition-all ${
        isDragging
          ? 'border-immo-accent-green/50 opacity-50 shadow-lg'
          : 'border-immo-border-default hover:border-immo-border-glow/40 hover:shadow-md hover:shadow-immo-accent-green/5'
      }`}
    >
      {/* Drag handle (visible on hover) */}
      <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
        <GripVertical className="h-3.5 w-3.5 text-immo-text-muted" />
      </div>

      {/* Row 1: Avatar + Name + Days badge */}
      <div className="mb-2 flex items-start gap-2.5">
        {/* Avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: color + '25', color }}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-immo-text-primary">
              {client.full_name}
            </p>
            {/* Urgent alert */}
            {client.is_urgent && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-immo-status-red" />
            )}
          </div>
          <p className="text-[11px] text-immo-text-muted">{client.phone}</p>
        </div>

        {/* Days in stage badge */}
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            daysOverdue
              ? 'bg-immo-status-red-bg text-immo-status-red'
              : client.days_in_stage > 3
                ? 'bg-immo-status-orange-bg text-immo-status-orange'
                : 'bg-immo-bg-card-hover text-immo-text-muted'
          }`}
        >
          {client.days_in_stage}j
        </span>
      </div>

      {/* Row 2: Source badge */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded bg-immo-bg-primary px-1.5 py-0.5 text-[10px] text-immo-text-secondary">
          <SourceIcon className="h-3 w-3" />
          {SOURCE_LABELS[client.source as ClientSource] ?? client.source}
        </span>
      </div>

      {/* Row 3: Project + Agent */}
      <div className="flex items-center gap-3 text-[10px] text-immo-text-muted">
        {client.project_name && (
          <span className="flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            {client.project_name}
          </span>
        )}
        {client.agent_name && (
          <span className="flex items-center gap-1 truncate">
            <UsersIcon className="h-3 w-3 shrink-0" />
            {client.agent_name}
          </span>
        )}
      </div>
    </div>
  )
}
