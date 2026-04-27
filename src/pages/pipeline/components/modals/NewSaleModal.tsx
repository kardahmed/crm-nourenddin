import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { useProjects } from '@/hooks/useProjects'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { formatPriceCompact } from '@/lib/constants'
import { format, addMonths } from 'date-fns'
import toast from 'react-hot-toast'

import { Step1Identification } from './newSale/Step1Identification'
import { Step2Biens } from './newSale/Step2Biens'
import { Step3Finance } from './newSale/Step3Finance'
import { Step4Schedule } from './newSale/Step4Schedule'
import { Step5Validation } from './newSale/Step5Validation'
import type { ClientInfo, AvailableUnit, SaleFormData, ScheduleLine } from './newSale/types'

interface NewSaleModalProps {
  isOpen: boolean
  onClose: () => void
  client: ClientInfo | null
}

export function NewSaleModal({ isOpen, onClose, client }: NewSaleModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<SaleFormData>({
    projectId: '',
    selectedUnits: [],
    amenities: [],
    discountType: '',
    discountValue: 0,
    financingMode: 'comptant',
    deliveryDate: '',
    installments: false,
    frequency: 'monthly',
    downPaymentPct: 30,
    firstPaymentDate: '',
    internalNotes: '',
  })
  const userId = useAuthStore((s) => s.session?.user?.id)
  const qc = useQueryClient()

  const { projects } = useProjects()

  // Fetch units for selected project
  const { data: units = [] } = useQuery({
    queryKey: ['sale-available-units', formData.projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('id, code, type, subtype, building, floor, surface, price, delivery_date, project_id')
        .eq('project_id', formData.projectId)
        .eq('status', 'available')
        .order('code')
      return (data ?? []) as unknown as AvailableUnit[]
    },
    enabled: !!formData.projectId,
  })

  // Selected units data
  const selectedUnitsData = useMemo(
    () => units.filter((u) => formData.selectedUnits.includes(u.id)),
    [units, formData.selectedUnits],
  )

  const unitsTotal = selectedUnitsData.reduce((s, u) => s + (u.price ?? 0), 0)
  const amenitiesTotal = formData.amenities.reduce((s, a) => s + a.price, 0)
  const grandTotal = unitsTotal + amenitiesTotal

  // Discount
  const discountAmount = formData.discountType === 'percentage'
    ? (grandTotal * formData.discountValue) / 100
    : formData.discountType === 'fixed' ? formData.discountValue : 0
  const finalPrice = Math.max(grandTotal - discountAmount, 0)

  // Schedule
  const schedule = useMemo((): ScheduleLine[] => {
    if (!formData.installments || !formData.firstPaymentDate || !formData.deliveryDate) return []
    const downPayment = Math.round(finalPrice * formData.downPaymentPct / 100)
    const remaining = finalPrice - downPayment
    const freqMonths = formData.frequency === 'monthly' ? 1 : formData.frequency === 'quarterly' ? 3 : 6
    const deliveryD = new Date(formData.deliveryDate)
    const firstD = new Date(formData.firstPaymentDate)
    const totalMonths = Math.max(1, Math.round((deliveryD.getTime() - firstD.getTime()) / (30 * 86400000)))
    const numInstallments = Math.max(1, Math.floor(totalMonths / freqMonths))
    const installmentAmount = Math.round(remaining / numInstallments)

    const lines: ScheduleLine[] = [
      { number: 1, date: formData.firstPaymentDate, amount: downPayment, description: `Acompte (${formData.downPaymentPct}%)` },
    ]
    for (let i = 0; i < numInstallments; i++) {
      const d = addMonths(firstD, (i + 1) * freqMonths)
      lines.push({
        number: i + 2,
        date: format(d, 'yyyy-MM-dd'),
        amount: i === numInstallments - 1 ? remaining - installmentAmount * (numInstallments - 1) : installmentAmount,
        description: `Échéance ${i + 1}/${numInstallments}`,
      })
    }
    return lines
  }, [formData.installments, formData.firstPaymentDate, formData.deliveryDate, formData.downPaymentPct, formData.frequency, finalPrice])

  const projectName = projects.find((p) => p.id === formData.projectId)?.name ?? ''
  const defaultDelivery = selectedUnitsData[0]?.delivery_date ?? ''

  const canProceed = step === 0
    ? !!formData.projectId
    : step === 1
      ? formData.selectedUnits.length > 0
      : step === 2
        ? !!formData.financingMode
        : true
  const STEPS = [
    { label: t('sale_modal.step_id') },
    { label: t('sale_modal.step_units') },
    { label: t('sale_modal.step_finance') },
    { label: t('sale_modal.step_docs') },
    { label: t('sale_modal.step_confirm') },
  ]
  const isLastStep = step === STEPS.length - 1

  const badges = [
    { label: t('sale_modal.badge_client'), done: !!client },
    { label: t('sale_modal.badge_project'), done: !!formData.projectId },
    { label: t('sale_modal.badge_units'), done: formData.selectedUnits.length > 0 },
    { label: t('sale_modal.badge_cni'), done: !!client?.nin_cin },
  ]
  const doneCount = badges.filter((b) => b.done).length
  const isReady = doneCount === 4

  // Submit mutation — runs the whole flow inside a single Postgres
  // transaction (see migration 036) so we never leave half-created sales
  // behind if any step fails.
  const submitSale = useMutation({
    mutationFn: async () => {
      if (!client || !userId) return

      const unitsPayload = formData.selectedUnits.map((unitId) => {
        const unitPrice = units.find((u) => u.id === unitId)?.price ?? 0
        const unitDiscount = formData.discountType === 'percentage'
          ? (unitPrice * formData.discountValue) / 100
          : formData.discountType === 'fixed'
            ? formData.discountValue / formData.selectedUnits.length
            : 0
        return {
          unit_id: unitId,
          total_price: unitPrice,
          discount_type: formData.discountType || '',
          discount_value: unitDiscount,
          final_price: unitPrice - unitDiscount,
        }
      })

      const schedulesPayload = formData.installments
        ? schedule.map((line) => ({
            installment_number: line.number,
            due_date: line.date,
            amount: line.amount,
            description: line.description,
          }))
        : []

      const amenitiesPayload = formData.amenities.map((a) => ({
        description: a.description,
        price: a.price,
      }))

      const unitCodes = selectedUnitsData.map((u) => u.code).join(', ')

      const { error: rpcErr } = await supabase.rpc('create_sale_atomic', {
        p_client_id: client.id,
        p_agent_id: userId,
        p_project_id: formData.projectId,
        p_units: unitsPayload,
        p_financing_mode: formData.financingMode,
        p_delivery_date: formData.deliveryDate || null,
        p_internal_notes: formData.internalNotes || null,
        p_schedules: schedulesPayload,
        p_amenities: amenitiesPayload,
        p_history_title: t('sale_modal.history_sale_created', { units: unitCodes, price: formatPriceCompact(finalPrice) }),
        p_history_metadata: { unit_ids: formData.selectedUnits, final_price: finalPrice },
      } as never)
      if (rpcErr) { handleSupabaseError(rpcErr); throw rpcErr }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['client-detail'] })
      qc.invalidateQueries({ queryKey: ['client-sales'] })
      qc.invalidateQueries({ queryKey: ['pipeline-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(t('sale_modal.toast_created'))
      handleClose()
    },
  })

  function handleClose() {
    setStep(0)
    setFormData({
      projectId: '', selectedUnits: [], amenities: [],
      discountType: '', discountValue: 0, financingMode: 'comptant', deliveryDate: '',
      installments: false, frequency: 'monthly', downPaymentPct: 30, firstPaymentDate: '', internalNotes: '',
    })
    onClose()
  }

  if (!client) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('sale_modal.title')} size="xl">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: step content */}
        <div className="min-w-0 flex-1">
          {/* Step bar */}
          <div className="mb-6 flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${i <= step ? 'bg-immo-accent-green' : 'bg-immo-border-default'}`} />
                )}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      i < step
                        ? 'bg-immo-accent-green text-immo-bg-primary'
                        : i === step
                          ? 'bg-immo-accent-green/15 text-immo-accent-green ring-1 ring-immo-accent-green/40'
                          : 'bg-immo-bg-card-hover text-immo-text-muted'
                    }`}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`mt-1 text-[9px] ${i === step ? 'font-medium text-immo-accent-green' : 'text-immo-text-muted'}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Step content */}
          {step === 0 && (
            <Step1Identification
              client={client}
              projects={projects}
              selectedProjectId={formData.projectId}
              onSelectProject={(id) => setFormData((d) => ({ ...d, projectId: id, selectedUnits: [] }))}
            />
          )}
          {step === 1 && (
            <Step2Biens
              units={units}
              selectedUnits={formData.selectedUnits}
              onToggleUnit={(id) =>
                setFormData((d) => ({
                  ...d,
                  selectedUnits: d.selectedUnits.includes(id)
                    ? d.selectedUnits.filter((u) => u !== id)
                    : [...d.selectedUnits, id],
                }))
              }
              amenities={formData.amenities}
              onAddAmenity={(a) => setFormData((d) => ({ ...d, amenities: [...d.amenities, a] }))}
              onRemoveAmenity={(id) => setFormData((d) => ({ ...d, amenities: d.amenities.filter((a) => a.id !== id) }))}
            />
          )}
          {step === 2 && (
            <Step3Finance
              formData={formData}
              grandTotal={grandTotal}
              discountAmount={discountAmount}
              finalPrice={finalPrice}
              defaultDelivery={defaultDelivery}
              onChange={(patch) => setFormData((d) => ({ ...d, ...patch }))}
            />
          )}
          {step === 3 && (
            <Step4Schedule
              formData={formData}
              finalPrice={finalPrice}
              schedule={schedule}
              onChange={(patch) => setFormData((d) => ({ ...d, ...patch }))}
            />
          )}
          {step === 4 && (
            <Step5Validation
              client={client}
              projectName={projectName}
              selectedUnitsData={selectedUnitsData}
              amenities={formData.amenities}
              finalPrice={finalPrice}
              discountAmount={discountAmount}
              schedule={schedule}
              internalNotes={formData.internalNotes}
              onNotesChange={(v) => setFormData((d) => ({ ...d, internalNotes: v }))}
            />
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-immo-border-default pt-4">
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => s - 1)}
                  className="text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary"
                >
                  ← {t('action.previous')}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-immo-text-muted hover:bg-immo-bg-card-hover hover:text-immo-text-primary"
              >
                {t('action.cancel')}
              </Button>
            </div>
            {isLastStep ? (
              <Button
                onClick={() => submitSale.mutate()}
                disabled={submitSale.isPending}
                className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
              >
                {submitSale.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
                ) : (
                  t('sale_modal.create_sale')
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed}
                className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90 disabled:opacity-50"
              >
                {t('action.next')} →
              </Button>
            )}
          </div>
        </div>

        {/* Right: recap panel */}
        <div className="w-full shrink-0 space-y-4 rounded-xl border border-immo-border-default bg-immo-bg-card p-4 lg:w-[260px]">
          {/* Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-immo-text-muted">{t('sale_modal.progression')}</span>
              <span className="font-semibold text-immo-text-primary">{doneCount}/4</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-immo-bg-primary">
              <div className="h-full bg-immo-accent-green transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  b.done
                    ? 'bg-immo-accent-green/10 text-immo-accent-green'
                    : 'bg-immo-bg-card-hover text-immo-text-muted'
                }`}
              >
                {b.done && <Check className="h-2.5 w-2.5" />}
                {b.label}
              </span>
            ))}
          </div>

          <div className="h-px bg-immo-border-default" />

          {/* Client */}
          <div>
            <p className="text-[10px] text-immo-text-muted">{t('sale_modal.badge_client')}</p>
            <p className="text-xs font-medium text-immo-text-primary">{client.full_name}</p>
          </div>

          {/* Project */}
          {projectName && (
            <div>
              <p className="text-[10px] text-immo-text-muted">{t('sale_modal.badge_project')}</p>
              <p className="text-xs font-medium text-immo-text-primary">{projectName}</p>
            </div>
          )}

          {/* Selected units */}
          {selectedUnitsData.length > 0 && (
            <div>
              <p className="text-[10px] text-immo-text-muted">{t('sale_modal.units_count', { count: selectedUnitsData.length })}</p>
              <div className="mt-1 space-y-1">
                {selectedUnitsData.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-immo-text-secondary">{u.code}</span>
                    <span className="text-immo-text-primary">{u.price != null ? formatPriceCompact(u.price) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {formData.amenities.length > 0 && (
            <div>
              <p className="text-[10px] text-immo-text-muted">{t('sale_modal.amenities_count', { count: formData.amenities.length })}</p>
              <div className="mt-1 space-y-1">
                {formData.amenities.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-immo-text-secondary">{a.description}</span>
                    <span className="text-immo-text-primary">{formatPriceCompact(a.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-px bg-immo-border-default" />

          {/* Schedule info */}
          {schedule.length > 0 && (
            <div>
              <p className="text-[10px] text-immo-text-muted">{t('sale_modal.payments')}</p>
              <p className="text-xs text-immo-text-primary">{t('sale_modal.schedule_count', { count: schedule.length })}</p>
            </div>
          )}

          <div className="h-px bg-immo-border-default" />

          {/* Total */}
          <div>
            {discountAmount > 0 && (
              <>
                <p className="text-[10px] text-immo-text-muted">{t('sale_modal.subtotal')}</p>
                <p className="text-xs text-immo-text-secondary line-through">{formatPriceCompact(grandTotal)}</p>
                <p className="text-[10px] text-immo-status-orange">{t('sale_modal.discount_amount', { amount: formatPriceCompact(discountAmount) })}</p>
              </>
            )}
            <p className="text-[10px] text-immo-text-muted">{discountAmount > 0 ? t('sale_modal.final_label') : t('sale_modal.total_label')}</p>
            <p className="text-lg font-bold text-immo-accent-green">{formatPriceCompact(finalPrice)}</p>
          </div>

          {/* Ready badge */}
          <div
            className={`rounded-lg px-3 py-2 text-center text-[11px] font-medium ${
              isReady
                ? 'bg-immo-accent-green/10 text-immo-accent-green'
                : 'bg-immo-status-orange-bg text-immo-status-orange'
            }`}
          >
            {isReady ? t('sale_modal.ready_to_finalize') : t('sale_modal.info_missing')}
          </div>
        </div>
      </div>
    </Modal>
  )
}
