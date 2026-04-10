import {
  Phone,
  PhoneCall,
  MessageCircle,
  MessageSquare,
  Mail,
  Bot,
  Calendar,
  UserCheck,
} from 'lucide-react'

interface QuickActionsProps {
  onAction: (action: string) => void
}

const ACTIONS = [
  { key: 'call', icon: Phone, label: 'Appeler', color: 'text-immo-accent-blue' },
  { key: 'whatsapp_call', icon: PhoneCall, label: 'Appel WA', color: 'text-immo-accent-green' },
  { key: 'whatsapp_message', icon: MessageCircle, label: 'Message WA', color: 'text-immo-accent-green' },
  { key: 'sms', icon: MessageSquare, label: 'SMS', color: 'text-immo-accent-blue' },
  { key: 'email', icon: Mail, label: 'Email', color: 'text-immo-status-orange' },
  { key: 'ai_task', icon: Bot, label: 'Suggestions AI', color: 'text-purple-400' },
  { key: 'visit_planned', icon: Calendar, label: 'Visite', color: 'text-immo-accent-blue' },
  { key: 'reassign', icon: UserCheck, label: 'Réassigner', color: 'text-immo-text-secondary' },
] as const

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ key, icon: Icon, label, color }) => (
        <button
          key={key}
          onClick={() => onAction(key)}
          className="flex items-center gap-2 rounded-lg border border-immo-border-default bg-immo-bg-card px-3 py-2 text-xs transition-colors hover:border-immo-border-glow/30 hover:bg-immo-bg-card-hover"
        >
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-immo-text-secondary">{label}</span>
        </button>
      ))}
    </div>
  )
}
