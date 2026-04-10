import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { UNIT_TYPE_LABELS, FINANCING_MODE_LABELS } from '@/types'
import type { UnitType, FinancingMode } from '@/types'
import { SaleContractPDF } from './SaleContractPDF'
import type { SaleContractData } from './SaleContractPDF'
import { PaymentSchedulePDF } from './PaymentSchedulePDF'
import type { PaymentScheduleData } from './PaymentSchedulePDF'
import { ReservationReceiptPDF } from './ReservationReceiptPDF'
import type { ReservationReceiptData } from './ReservationReceiptPDF'
import { format } from 'date-fns'

// ═══ Helpers ═══

function contractNumber(): string {
  return `CTR-${Date.now().toString(36).toUpperCase()}`
}

async function uploadPDF(blob: Blob, tenantId: string, clientId: string, prefix: string): Promise<string> {
  const filename = `${prefix}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`
  const path = `${tenantId}/${clientId}/${filename}`

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, blob, { contentType: 'application/pdf' })

  if (error) { handleSupabaseError(error); throw error }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
  return urlData.publicUrl
}

async function insertDocRecord(tenantId: string, clientId: string, saleId: string | null, type: string, name: string, url: string) {
  await supabase.from('documents').insert({
    tenant_id: tenantId,
    client_id: clientId,
    sale_id: saleId,
    type,
    name,
    url,
  } as never)
}

async function fetchTenant(tenantId: string) {
  const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
  if (error) throw error
  return data as { name: string; address: string | null; phone: string | null; email: string | null; logo_url: string | null }
}

// ═══ Generate Sale Contract ═══

export async function generateSaleContract(saleId: string): Promise<string> {
  // Fetch sale with joins
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*, clients(full_name, nin_cin, address, phone), units(code, type, subtype, surface, floor, building, delivery_date), projects(name, location), users!sales_agent_id_fkey(first_name, last_name)')
    .eq('id', saleId)
    .single()

  if (error) { handleSupabaseError(error); throw error }

  const s = sale as Record<string, unknown>
  const client = s.clients as { full_name: string; nin_cin: string | null; address: string | null; phone: string }
  const unit = s.units as { code: string; type: UnitType; subtype: string | null; surface: number | null; floor: number | null; building: string | null; delivery_date: string | null }
  const project = s.projects as { name: string; location: string | null }
  const agent = s.users as { first_name: string; last_name: string }
  const tenant = await fetchTenant(s.tenant_id as string)

  // Fetch schedule
  const { data: scheduleRows } = await supabase
    .from('payment_schedules')
    .select('installment_number, due_date, amount, description')
    .eq('sale_id', saleId)
    .order('installment_number')

  const schedule = (scheduleRows ?? []).map((r: { installment_number: number; due_date: string; amount: number; description: string | null }) => ({
    number: r.installment_number,
    date: format(new Date(r.due_date), 'dd/MM/yyyy'),
    amount: r.amount,
    description: r.description ?? `Échéance ${r.installment_number}`,
  }))

  const contractData: SaleContractData = {
    contractNumber: contractNumber(),
    date: format(new Date(), 'dd/MM/yyyy'),
    tenantName: tenant.name,
    tenantAddress: tenant.address ?? '',
    tenantPhone: tenant.phone ?? '',
    tenantEmail: tenant.email ?? '',
    tenantLogo: tenant.logo_url,
    clientName: client.full_name,
    clientNIN: client.nin_cin ?? '-',
    clientAddress: client.address ?? '-',
    clientPhone: client.phone,
    unitCode: unit.code,
    unitType: `${UNIT_TYPE_LABELS[unit.type]}${unit.subtype ? ` ${unit.subtype}` : ''}`,
    unitSurface: unit.surface,
    unitFloor: unit.floor,
    unitBuilding: unit.building,
    projectName: project.name,
    projectLocation: project.location,
    deliveryDate: unit.delivery_date ? format(new Date(unit.delivery_date), 'dd/MM/yyyy') : null,
    totalPrice: s.total_price as number,
    discountAmount: s.discount_value as number,
    finalPrice: s.final_price as number,
    financingMode: FINANCING_MODE_LABELS[(s.financing_mode as FinancingMode)] ?? (s.financing_mode as string),
    schedule,
    agentName: `${agent.first_name} ${agent.last_name}`,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(SaleContractPDF, { data: contractData }) as any).toBlob()
  const url = await uploadPDF(blob, s.tenant_id as string, s.client_id as string, 'contrat-vente')
  await insertDocRecord(s.tenant_id as string, s.client_id as string, saleId, 'contrat_vente', `Contrat de vente — ${unit.code}`, url)

  return url
}

// ═══ Generate Payment Schedule ═══

export async function generatePaymentSchedule(saleId: string): Promise<string> {
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*, clients(full_name, nin_cin, phone), units(code), projects(name), users!sales_agent_id_fkey(first_name, last_name)')
    .eq('id', saleId)
    .single()

  if (error) { handleSupabaseError(error); throw error }

  const s = sale as Record<string, unknown>
  const client = s.clients as { full_name: string; nin_cin: string | null; phone: string }
  const unit = s.units as { code: string }
  const project = s.projects as { name: string }
  const agent = s.users as { first_name: string; last_name: string }
  const tenant = await fetchTenant(s.tenant_id as string)

  const { data: scheduleRows } = await supabase
    .from('payment_schedules')
    .select('installment_number, due_date, amount, description, status')
    .eq('sale_id', saleId)
    .order('installment_number')

  const schedule = (scheduleRows ?? []).map((r: { installment_number: number; due_date: string; amount: number; description: string | null; status: string }) => ({
    number: r.installment_number,
    date: format(new Date(r.due_date), 'dd/MM/yyyy'),
    amount: r.amount,
    description: r.description ?? `Échéance ${r.installment_number}`,
    status: r.status,
  }))

  const data: PaymentScheduleData = {
    contractNumber: contractNumber(),
    date: format(new Date(), 'dd/MM/yyyy'),
    tenantName: tenant.name,
    tenantAddress: tenant.address ?? '',
    tenantPhone: tenant.phone ?? '',
    tenantLogo: tenant.logo_url,
    clientName: client.full_name,
    clientNIN: client.nin_cin ?? '-',
    clientPhone: client.phone,
    unitCode: unit.code,
    projectName: project.name,
    finalPrice: s.final_price as number,
    financingMode: FINANCING_MODE_LABELS[(s.financing_mode as FinancingMode)] ?? (s.financing_mode as string),
    schedule,
    agentName: `${agent.first_name} ${agent.last_name}`,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(PaymentSchedulePDF, { data }) as any).toBlob()
  const url = await uploadPDF(blob, s.tenant_id as string, s.client_id as string, 'echeancier')
  await insertDocRecord(s.tenant_id as string, s.client_id as string, saleId, 'echeancier', `Échéancier — ${unit.code}`, url)

  return url
}

// ═══ Generate Reservation Receipt ═══

export async function generateReservationReceipt(reservationId: string): Promise<string> {
  const { data: res, error } = await supabase
    .from('reservations')
    .select('*, clients(full_name, nin_cin, phone), units(code, type, subtype, surface), projects(name, location), users!reservations_agent_id_fkey(first_name, last_name)')
    .eq('id', reservationId)
    .single()

  if (error) { handleSupabaseError(error); throw error }

  const r = res as Record<string, unknown>
  const client = r.clients as { full_name: string; nin_cin: string | null; phone: string }
  const unit = r.units as { code: string; type: UnitType; subtype: string | null; surface: number | null }
  const project = r.projects as { name: string; location: string | null }
  const agent = r.users as { first_name: string; last_name: string }
  const tenant = await fetchTenant(r.tenant_id as string)

  const DEPOSIT_METHODS: Record<string, string> = { cash: 'Espèces', bank_transfer: 'Virement bancaire', cheque: 'Chèque' }

  const data: ReservationReceiptData = {
    receiptNumber: contractNumber(),
    date: format(new Date(), 'dd/MM/yyyy'),
    tenantName: tenant.name,
    tenantAddress: tenant.address ?? '',
    tenantPhone: tenant.phone ?? '',
    tenantLogo: tenant.logo_url,
    clientName: client.full_name,
    clientNIN: r.nin_cin as string,
    clientPhone: client.phone,
    unitCode: unit.code,
    unitType: `${UNIT_TYPE_LABELS[unit.type]}${unit.subtype ? ` ${unit.subtype}` : ''}`,
    unitSurface: unit.surface,
    projectName: project.name,
    projectLocation: project.location,
    depositAmount: r.deposit_amount as number,
    depositMethod: DEPOSIT_METHODS[(r.deposit_method as string)] ?? (r.deposit_method as string) ?? '-',
    depositReference: r.deposit_reference as string | null,
    durationDays: r.duration_days as number,
    expiresAt: format(new Date(r.expires_at as string), 'dd/MM/yyyy'),
    agentName: `${agent.first_name} ${agent.last_name}`,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(ReservationReceiptPDF, { data }) as any).toBlob()
  const url = await uploadPDF(blob, r.tenant_id as string, r.client_id as string, 'bon-reservation')
  await insertDocRecord(r.tenant_id as string, r.client_id as string, null, 'bon_reservation', `Bon de réservation — ${unit.code}`, url)

  return url
}
