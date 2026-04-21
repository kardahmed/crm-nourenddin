import { useTranslation } from 'react-i18next'
import type { SupportedLang } from '@/i18n'

const LANGS: { code: SupportedLang; label: string; title: string }[] = [
  { code: 'fr', label: 'FR', title: 'Français' },
  { code: 'ar', label: 'AR', title: 'العربية' },
  { code: 'en', label: 'EN', title: 'English' },
]

export function LanguageSwitch() {
  const { i18n } = useTranslation()
  const current = i18n.language as SupportedLang

  return (
    <div
      className="flex h-8 items-center gap-1 rounded-lg border border-immo-border-default bg-immo-bg-primary px-1"
      role="group"
      aria-label="Language"
    >
      {LANGS.map((lang) => {
        const active = current === lang.code
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => {
              if (!active) i18n.changeLanguage(lang.code)
            }}
            title={lang.title}
            aria-pressed={active}
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              active
                ? 'bg-immo-accent-green/15 text-immo-accent-green'
                : 'text-immo-text-muted hover:bg-immo-bg-card-hover hover:text-immo-text-primary'
            }`}
          >
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}
