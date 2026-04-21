import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, GitBranch, Bookmark, FileText, Bell, Globe, Shield, Palette, Sparkles, MessageCircle, Calendar, ToggleLeft, UserPlus, KeyRound } from 'lucide-react'
import {
  CompanySection,
  PipelineSection,
  BrandingSection,
  ReceptionSection,
  ReservationsSection,
  TemplatesSection,
  NotificationsSection,
  LanguageSection,
  SecuritySection,
} from './sections'
// PlaybookSection moved to Super Admin
import { TaskConfigSection } from './sections/TaskConfigSection'
import { WhatsAppSection } from './sections/WhatsAppSection'
import { VisitScheduleSection } from './sections/VisitScheduleSection'
import { PermissionProfilesSection } from './sections/PermissionProfilesSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { AiKeySection } from './sections/AiKeySection'
import { useAuthStore } from '@/store/authStore'

type Section = 'company' | 'pipeline' | 'reception' | 'playbook' | 'tasks' | 'visits' | 'profiles' | 'features' | 'whatsapp' | 'branding' | 'reservations' | 'templates' | 'notifications' | 'language' | 'security' | 'ai_key'

const SECTION_ICONS: Record<Section, typeof Building2> = {
  company: Building2,
  pipeline: GitBranch,
  reception: UserPlus,
  playbook: Sparkles,
  tasks: Bell,
  visits: Calendar,
  profiles: Shield,
  features: ToggleLeft,
  whatsapp: MessageCircle,
  branding: Palette,
  reservations: Bookmark,
  templates: FileText,
  notifications: Bell,
  language: Globe,
  security: Shield,
  ai_key: KeyRound,
}

const SECTION_LABELS: Record<Section, string> = {
  company: 'settings_section.company',
  pipeline: 'settings_section.pipeline',
  reception: 'settings_section.reception',
  playbook: 'settings_section.playbook',
  tasks: 'settings_section.tasks',
  visits: 'settings_section.visits',
  profiles: 'settings_section.profiles',
  features: 'settings_section.features',
  whatsapp: 'settings_section.whatsapp',
  branding: 'settings_section.branding',
  reservations: 'settings_section.reservations',
  templates: 'settings_section.templates',
  notifications: 'settings_section.notifications',
  language: 'settings_section.language',
  security: 'settings_section.security',
  ai_key: 'settings_section.ai_key',
}

const BASE_SECTION_KEYS: Section[] = ['company', 'pipeline', 'reception', 'tasks', 'visits', 'features', 'whatsapp', 'branding', 'reservations', 'templates', 'notifications', 'language', 'security']

export function SettingsPage() {
  const { t } = useTranslation()
  const { role } = useAuthStore()
  const [section, setSection] = useState<Section>('company')

  const isAdmin = role === 'admin'
  const sectionKeys: Section[] = isAdmin ? [...BASE_SECTION_KEYS, 'ai_key'] : BASE_SECTION_KEYS

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Side menu */}
      <div className="w-full shrink-0 space-y-1 lg:w-[220px]">
        {sectionKeys.map((key) => {
          const Icon = SECTION_ICONS[key]
          return (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                section === key
                  ? 'bg-immo-accent-green/10 font-medium text-immo-accent-green'
                  : 'text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(SECTION_LABELS[key])}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {section === 'company' && <CompanySection />}
        {section === 'pipeline' && <PipelineSection />}
        {section === 'reception' && <ReceptionSection />}
        {section === 'tasks' && <TaskConfigSection />}
        {section === 'visits' && <VisitScheduleSection />}
        {section === 'profiles' && <PermissionProfilesSection />}
        {section === 'features' && <FeaturesSection />}
        {section === 'whatsapp' && <WhatsAppSection />}
        {section === 'branding' && <BrandingSection />}
        {section === 'reservations' && <ReservationsSection />}
        {section === 'templates' && <TemplatesSection />}
        {section === 'notifications' && <NotificationsSection />}
        {section === 'language' && <LanguageSection />}
        {section === 'security' && <SecuritySection />}
        {section === 'ai_key' && <AiKeySection />}
      </div>
    </div>
  )
}
