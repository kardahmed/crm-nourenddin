import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar, Bookmark, DollarSign, CreditCard, FileText, Receipt,
  StickyNote, ListTodo, Clock,
} from 'lucide-react'
import {
  VisitsTab,
  ReservationTab,
  SaleTab,
  ScheduleTab,
  PaymentTab,
  DocumentsTab,
  ChargesTab,
  NotesTab,
  TasksTab,
  HistoryTab,
} from './tabs'

interface ClientTabsProps {
  clientId: string
  tenantId: string
}

const TAB_KEYS = [
  'visits', 'reservation', 'sale', 'schedule', 'payment',
  'documents', 'charges', 'notes', 'tasks', 'history',
] as const

type TabKey = (typeof TAB_KEYS)[number]

const TAB_ICONS: Record<TabKey, typeof Calendar> = {
  visits: Calendar,
  reservation: Bookmark,
  sale: DollarSign,
  schedule: Clock,
  payment: CreditCard,
  documents: FileText,
  charges: Receipt,
  notes: StickyNote,
  tasks: ListTodo,
  history: Clock,
}

export function ClientTabs({ clientId, tenantId }: ClientTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('visits')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-immo-border-default">
        {TAB_KEYS.map((key) => {
          const Icon = TAB_ICONS[key]
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs transition-colors ${
                activeTab === key
                  ? 'border-immo-accent-green font-medium text-immo-accent-green'
                  : 'border-transparent text-immo-text-muted hover:text-immo-text-secondary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`tab.${key}`)}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="pt-5">
        {activeTab === 'visits' && <VisitsTab clientId={clientId} tenantId={tenantId} />}
        {activeTab === 'reservation' && <ReservationTab clientId={clientId} />}
        {activeTab === 'sale' && <SaleTab clientId={clientId} />}
        {activeTab === 'schedule' && <ScheduleTab clientId={clientId} />}
        {activeTab === 'payment' && <PaymentTab clientId={clientId} />}
        {activeTab === 'documents' && <DocumentsTab clientId={clientId} />}
        {activeTab === 'charges' && <ChargesTab clientId={clientId} tenantId={tenantId} />}
        {activeTab === 'notes' && <NotesTab clientId={clientId} />}
        {activeTab === 'tasks' && <TasksTab clientId={clientId} tenantId={tenantId} />}
        {activeTab === 'history' && <HistoryTab clientId={clientId} />}
      </div>
    </div>
  )
}
