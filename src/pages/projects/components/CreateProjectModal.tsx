import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjects } from '@/hooks/useProjects'

const schema = z.object({
  name: z.string().min(2, 'create_project.name_required'),
  code: z.string().min(2, 'create_project.code_required'),
  description: z.string().optional(),
  location: z.string().optional(),
  delivery_date: z.string().optional(),
  avg_price_per_unit: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const { t } = useTranslation()
  const { createProject } = useProjects()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      // eslint-disable-next-line react-hooks/purity -- seeded default code for form, computed once
      code: `PRJ-${String(Date.now()).slice(-6)}`,
    },
  })

  async function onSubmit(data: FormData) {
    await createProject.mutateAsync({
      name: data.name,
      code: data.code,
      description: data.description || null,
      location: data.location || null,
      delivery_date: data.delivery_date || null,
      avg_price_per_unit: data.avg_price_per_unit ? Number(data.avg_price_per_unit) : null,
    })
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('create_project.title')} subtitle={t('create_project.subtitle')} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">{t('create_project.name')}</Label>
            <Input
              {...register('name')}
              placeholder={t('create_project.name_placeholder')}
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
            />
            {errors.name && <p className="text-xs text-immo-status-red">{t(errors.name.message ?? '')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">{t('create_project.code')}</Label>
            <Input
              {...register('code')}
              placeholder={t('create_project.code_placeholder')}
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
            />
            {errors.code && <p className="text-xs text-immo-status-red">{t(errors.code.message ?? '')}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-immo-text-secondary">{t('create_project.description')}</Label>
          <Input
            {...register('description')}
            placeholder={t('create_project.description_placeholder')}
            className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">{t('create_project.location')}</Label>
            <Input
              {...register('location')}
              placeholder={t('create_project.location_placeholder')}
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">{t('create_project.delivery_date')}</Label>
            <Input
              type="date"
              {...register('delivery_date')}
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-immo-text-secondary">{t('create_project.avg_price')}</Label>
          <Input
            type="number"
            {...register('avg_price_per_unit')}
            placeholder={t('create_project.avg_price_placeholder')}
            className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary"
          >
            {t('create_project.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createProject.isPending}
            className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            {createProject.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
            ) : (
              t('create_project.submit')
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
