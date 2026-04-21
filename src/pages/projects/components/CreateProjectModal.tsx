import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjects } from '@/hooks/useProjects'

const schema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  code: z.string().min(2, 'Code requis'),
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
    <Modal isOpen={isOpen} onClose={onClose} title="Nouveau projet" subtitle="Créer un programme immobilier" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Nom du projet *</Label>
            <Input
              {...register('name')}
              placeholder="Résidence Les Oliviers"
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
            />
            {errors.name && <p className="text-xs text-immo-status-red">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Code *</Label>
            <Input
              {...register('code')}
              placeholder="PRJ-001"
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
            />
            {errors.code && <p className="text-xs text-immo-status-red">{errors.code.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-immo-text-secondary">Description</Label>
          <Input
            {...register('description')}
            placeholder="Description du programme..."
            className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Localisation</Label>
            <Input
              {...register('location')}
              placeholder="Alger, Hydra"
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Date de livraison</Label>
            <Input
              type="date"
              {...register('delivery_date')}
              className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-immo-text-secondary">Prix moyen par unité (DA)</Label>
          <Input
            type="number"
            {...register('avg_price_per_unit')}
            placeholder="12000000"
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
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={createProject.isPending}
            className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            {createProject.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
            ) : (
              'Créer le projet'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
