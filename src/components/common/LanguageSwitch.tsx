import { useTranslation } from 'react-i18next'
import type { SupportedLang } from '@/i18n'

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
  { code: 'en', label: 'EN' },
]

export function LanguageSwitch() {
  const { i18n } = useTranslation()
  const current = i18n.language as SupportedLang

  function toggle() {
    const order = ['fr', 'ar', 'en'] as const
    const currentIndex = order.indexOf(current as typeof order[number])
    const nextIndex = (currentIndex + 1) % order.length
    i18n.changeLanguage(order[nextIndex])
  }

  const getTitleText = () => {
    if (current === 'fr') return 'العربية'
    if (current === 'ar') return 'English'
    return 'Français'
  }

  return (
    <button
      onClick={toggle}
      className="flex h-8 items-center gap-1 rounded-lg border border-immo-border-default bg-immo-bg-primary px-2 text-xs font-medium transition-colors hover:bg-immo-bg-card-hover"
      title={getTitleText()}
    >
      {LANGS.map((lang) => (
        <span
          key={lang.code}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            current === lang.code
              ? 'bg-immo-accent-green/15 text-immo-accent-green'
              : 'text-immo-text-muted'
          }`}
        >
          {lang.label}
        </span>
      ))}
    </button>
  )
}
