import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Phone, PhoneCall, MessageCircle, MessageSquare,
  Mail, Bot, Calendar, UserCheck, Bookmark, DollarSign,
} from 'lucide-react'
import { CallLogModal } from './modals/CallLogModal'
import { CallScriptModal } from './modals/CallScriptModal'
import { MessageTemplateModal } from './modals/MessageTemplateModal'
import type { PipelineStage } from '@/types'

interface QuickActionsProps {
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  clientStage?: PipelineStage
  agentId: string
  agentName?: string
  projectName?: string
  onAction: (action: string) => void
  onOpenVisit?: () => void
  onOpenReservation?: () => void
  onOpenSale?: () => void
  onOpenAI?: () => void
  onOpenReassign?: () => void
}

export function QuickActions({
  clientId, clientName, clientPhone, clientEmail, clientStage,
  agentId, agentName, projectName,
  onAction, onOpenVisit, onOpenReservation, onOpenSale, onOpenAI, onOpenReassign,
}: QuickActionsProps) {
  const { t } = useTranslation()
  const [showCallLog, setShowCallLog] = useState(false)
  const [showCallScript, setShowCallScript] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  const phone = clientPhone.replace(/[\s\-()]/g, '').replace(/^0/, '213')

  function handleAction(key: string) {
    switch (key) {
      case 'call':
        // Open guided call script modal
        window.open(`tel:${clientPhone}`, '_self')
        setShowCallScript(true)
        break

      case 'whatsapp_call':
        // Open WhatsApp call
        window.open(`https://wa.me/${phone}`, '_blank')
        onAction('whatsapp_call')
        break

      case 'whatsapp_message':
        // Open message template modal → WhatsApp
        setShowMessage(true)
        break

      case 'sms':
        // Open SMS app
        window.open(`sms:${clientPhone}`, '_self')
        onAction('sms')
        break

      case 'email':
        // Open email client
        if (clientEmail) {
          window.open(`mailto:${clientEmail}`, '_self')
        }
        onAction('email')
        break

      case 'ai_task':
        onOpenAI?.()
        break

      case 'visit_planned':
        onOpenVisit?.()
        break

      case 'reservation':
        onOpenReservation?.()
        break

      case 'sale':
        onOpenSale?.()
        break

      case 'reassign':
        onOpenReassign?.()
        break

      default:
        onAction(key)
    }
  }

  const ACTIONS = [
    { key: 'call', icon: Phone, label: t('quick_actions.call'), color: 'text-immo-accent-blue' },
    { key: 'whatsapp_call', icon: PhoneCall, label: t('quick_actions.whatsapp_call'), color: 'text-[#25D366]' },
    { key: 'whatsapp_message', icon: MessageCircle, label: t('quick_actions.whatsapp_message'), color: 'text-[#25D366]' },
    { key: 'sms', icon: MessageSquare, label: t('quick_actions.sms'), color: 'text-immo-accent-blue' },
    { key: 'email', icon: Mail, label: t('quick_actions.email'), color: 'text-immo-status-orange', disabled: !clientEmail },
    { key: 'ai_task', icon: Bot, label: t('quick_actions.ai_task'), color: 'text-purple-400' },
    { key: 'visit_planned', icon: Calendar, label: t('quick_actions.visit'), color: 'text-immo-accent-blue' },
    { key: 'reservation', icon: Bookmark, label: t('quick_actions.reservation'), color: 'text-immo-status-orange' },
    { key: 'sale', icon: DollarSign, label: t('quick_actions.sale'), color: 'text-immo-accent-green' },
    { key: 'reassign', icon: UserCheck, label: t('quick_actions.reassign'), color: 'text-immo-text-secondary' },
  ]

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map(({ key, icon: Icon, label, color, ...rest }) => (
          <button
            key={key}
            onClick={() => handleAction(key)}
            disabled={'disabled' in rest && rest.disabled}
            className="flex items-center gap-2 rounded-lg border border-immo-border-default bg-immo-bg-card px-3 py-2 text-xs transition-colors hover:border-immo-border-glow/30 hover:bg-immo-bg-card-hover disabled:opacity-40"
          >
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-immo-text-secondary">{label}</span>
          </button>
        ))}
      </div>

      {/* Call script modal (guided call) */}
      <CallScriptModal
        isOpen={showCallScript}
        onClose={() => setShowCallScript(false)}
        clientId={clientId}
        clientName={clientName}
        clientPhone={clientPhone}
        clientStage={clientStage ?? 'accueil'}
        agentId={agentId}
      />

      {/* Simple call log modal (fallback) */}
      <CallLogModal
        isOpen={showCallLog}
        onClose={() => setShowCallLog(false)}
        clientId={clientId}
        clientName={clientName}
        agentId={agentId}
      />

      {/* Message template modal */}
      <MessageTemplateModal
        isOpen={showMessage}
        onClose={() => setShowMessage(false)}
        clientName={clientName}
        clientPhone={clientPhone}
        agentName={agentName}
        projectName={projectName}
      />
    </>
  )
}
