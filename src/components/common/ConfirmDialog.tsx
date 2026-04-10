import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'default'
  loading?: boolean
  children?: React.ReactNode
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  confirmVariant = 'default',
  loading = false,
  children,
}: ConfirmDialogProps) {
  const isDanger = confirmVariant === 'danger'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="border-immo-border-default bg-immo-bg-card sm:max-w-[440px]">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            {isDanger && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-immo-status-red-bg">
                <AlertTriangle className="h-5 w-5 text-immo-status-red" />
              </div>
            )}
            <div>
              <DialogTitle className="text-base font-semibold text-immo-text-primary">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-sm text-immo-text-muted">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children}

        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={
              isDanger
                ? 'bg-immo-status-red font-semibold text-white hover:bg-immo-status-red/90'
                : 'bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90'
            }
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
