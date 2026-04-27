import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
