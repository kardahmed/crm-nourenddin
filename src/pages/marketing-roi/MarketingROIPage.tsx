import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, BarChart3, Megaphone, Mail, FileText } from 'lucide-react'
import { ExpensesTab } from './tabs/ExpensesTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'
import { CampaignsTab } from './tabs/CampaignsTab'
import { EmailCampaignsTab } from './tabs/EmailCampaignsTab'
import { EmailTemplatesTab } from './tabs/EmailTemplatesTab'

type Tab = 'expenses' | 'analytics' | 'campaigns' | 'email_campaigns' | 'email_templates'

export function MarketingROIPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('analytics')

  const TABS: Array<{ key: Tab; label: string; icon: typeof DollarSign }> = [
    { key: 'analytics', label: t('marketing_roi.tab_analytics'), icon: BarChart3 },
    { key: 'expenses', label: t('marketing_roi.tab_expenses'), icon: DollarSign },
    { key: 'campaigns', label: t('marketing_roi.tab_campaigns'), icon: Megaphone },
    { key: 'email_campaigns', label: t('marketing_roi.tab_email_campaigns'), icon: Mail },
    { key: 'email_templates', label: t('marketing_roi.tab_email_templates'), icon: FileText },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-immo-border-default overflow-x-auto">
        {TABS.map((tab2) => (
          <button key={tab2.key} onClick={() => setTab(tab2.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${tab === tab2.key ? 'border-immo-accent-green text-immo-accent-green' : 'border-transparent text-immo-text-muted hover:text-immo-text-primary'}`}>
            <tab2.icon className="h-3.5 w-3.5" /> {tab2.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'expenses' && <ExpensesTab />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'email_campaigns' && <EmailCampaignsTab />}
      {tab === 'email_templates' && <EmailTemplatesTab />}
    </div>
  )
}
