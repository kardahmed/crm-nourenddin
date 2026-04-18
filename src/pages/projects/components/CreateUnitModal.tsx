import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnits } from '@/hooks/useUnits'
import { useProjects } from '@/hooks/useProjects'
import { UNIT_TYPE_LABELS, UNIT_SUBTYPE_LABELS } from '@/types'
import type { UnitType, UnitSubtype } from '@/types'

const schema = z.object({
  project_id: z.string().min(1, 'Projet requis'),
  code: z.string().min(1, 'Code requis'),
  type: z.string().min(1, 'Type requis'),
  subtype: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  surface: z.string().optional(),
  price: z.string().optional(),
  delivery_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CreateUnitModalProps {
  isOpen: boolean
  onClose: () => void
  defaultProjectId?: string
}

export function CreateUnitModal({ isOpen, onClose, defaultProjectId }: CreateUnitModalProps) {
  const { createUnit } = useUnits()
  const { projects } = useProjects()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: defaultProjectId ?? '',
      code: `U-${String(Date.now()).slice(-6)}`,
      type: 'apartment',
    },
  })

  const selectedType = watch('type')

  async function onSubmit(data: FormData) {
    await createUnit.mutateAsync({
      project_id: data.project_id,
      code: data.code,
      type: data.type as UnitType,
      subtype: data.subtype ? (data.subtype as UnitSubtype) : null,
      building: data.building || null,
      floor: data.floor ? Number(data.floor) : null,
      surface: data.surface ? Number(data.surface) : null,
      price: data.price ? Number(data.price) : null,
      delivery_date: data.delivery_date || null,
    })
    reset()
    onClose()
  }

  const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle unité" subtitle="Ajouter un bien au projet" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Projet */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Projet *</Label>
            <Select
              value={watch('project_id')}
              onValueChange={(v) => { if (v) setValue('project_id', v) }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent className="border-immo-border-default bg-immo-bg-card">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.project_id && <p className="text-xs text-immo-status-red">{errors.project_id.message}</p>}
          </div>

          {/* Code */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Code *</Label>
            <Input {...register('code')} placeholder="U-001" className={inputClass} />
            {errors.code && <p className="text-xs text-immo-status-red">{errors.code.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => { if (v) setValue('type', v) }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-immo-border-default bg-immo-bg-card">
                {Object.entries(UNIT_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sous-type */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Sous-type</Label>
            <Select
              value={watch('subtype') ?? ''}
              onValueChange={(v) => { if (v) setValue('subtype', v) }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="border-immo-border-default bg-immo-bg-card">
                {Object.entries(UNIT_SUBTYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bâtiment */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Bâtiment</Label>
            <Input {...register('building')} placeholder="Bloc A" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Étage */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Étage</Label>
            <Input type="number" {...register('floor')} placeholder="3" className={inputClass} />
          </div>

          {/* Surface */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Surface (m²)</Label>
            <Input type="number" {...register('surface')} placeholder="85" className={inputClass} />
          </div>

          {/* Prix */}
          <div className="space-y-1.5">
            <Label className="text-sm text-immo-text-secondary">Prix (DA)</Label>
            <Input type="number" {...register('price')} placeholder="12000000" className={inputClass} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-immo-text-secondary">Date de livraison</Label>
          <Input type="date" {...register('delivery_date')} className={inputClass} />
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
            disabled={createUnit.isPending}
            className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            {createUnit.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
            ) : (
              'Créer l\'unité'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
