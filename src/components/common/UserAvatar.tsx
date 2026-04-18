import { useState } from 'react'

/**
 * Renders a user's avatar image when available, falling back to colored
 * initials. Color is deterministic per full name so the same agent always
 * gets the same hue across the app (sidebar, kanban, agent list, etc.).
 */
interface UserAvatarProps {
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

const PALETTE = ['#00D4A0', '#3782FF', '#FF9A1E', '#A855F7', '#06B6D4', '#EAB308', '#F97316', '#EC4899']

function nameToColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false)

  const first = firstName ?? ''
  const last = lastName ?? ''
  const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '??'
  const color = nameToColor(`${first}${last}`)
  const sizeCls = SIZE_CLASSES[size]

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeCls} shrink-0 rounded-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeCls} flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
