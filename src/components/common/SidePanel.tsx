import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  side?: 'right' | 'left'
  children: ReactNode
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  side = 'right',
  children,
}: SidePanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side={side}
        className="w-full border-immo-border-default bg-immo-bg-card p-0 sm:w-[480px] sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-immo-border-default px-6 py-4">
          <SheetTitle className="text-lg font-semibold text-immo-text-primary">
            {title}
          </SheetTitle>
          {subtitle && (
            <SheetDescription className="text-sm text-immo-text-muted">
              {subtitle}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
