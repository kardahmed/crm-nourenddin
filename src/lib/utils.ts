import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// BCP-47 locale tag for the current i18n language. Hardcoding 'fr' across
// the codebase ignored the user's chosen language; this helper centralises
// the mapping so dates/numbers/currencies follow the active locale.
export function currentLocaleTag(): string {
  const lang = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'fr'
  if (lang.startsWith('ar')) return 'ar-DZ'
  if (lang.startsWith('en')) return 'en-US'
  return 'fr-FR'
}

export function formatLocalDate(input: string | number | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = input instanceof Date ? input : new Date(input)
  return d.toLocaleDateString(currentLocaleTag(), opts)
}

export function formatLocalNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(currentLocaleTag(), opts)
}

// Cryptographically strong random token. Uses crypto.randomUUID when
// available (all modern browsers + Node >= 19) and falls back to
// crypto.getRandomValues so we never fall back to Math.random.
export function randomToken(length = 8): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid.replace(/-/g, '').slice(0, length)
  const bytes = new Uint8Array(Math.ceil(length / 2))
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length)
}
