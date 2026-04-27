import type { PipelineStage, UnitType, UnitSubtype, FinancingMode, DiscountType } from '@/types'

export interface ClientInfo {
  id: string
  full_name: string
  phone: string
  nin_cin: string | null
  pipeline_stage: PipelineStage
}

export interface AvailableUnit {
  id: string
  code: string
  type: UnitType
  subtype: UnitSubtype | null
  building: string | null
  floor: number | null
  surface: number | null
  price: number | null
  delivery_date: string | null
  project_id: string
}

export interface Amenity {
  id: string
  description: string
  price: number
}

export interface ScheduleLine {
  number: number
  date: string
  amount: number
  description: string
}

export interface SaleFormData {
  projectId: string
  selectedUnits: string[]
  amenities: Amenity[]
  // Step 3
  discountType: DiscountType | ''
  discountValue: number
  financingMode: FinancingMode
  deliveryDate: string
  // Step 4
  installments: boolean
  frequency: 'monthly' | 'quarterly' | 'semiannual'
  downPaymentPct: number
  firstPaymentDate: string
  // Step 5
  internalNotes: string
}
