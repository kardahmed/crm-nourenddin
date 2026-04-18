import type { CsvFieldSpec } from '@/components/common/CsvImportModal'

function parseNumber(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseInteger(raw: string): number | null {
  const n = parseNumber(raw)
  return n == null ? null : Math.trunc(n)
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const asDate = new Date(raw)
  if (!isNaN(asDate.getTime())) return asDate.toISOString().split('T')[0]
  return null
}

function normaliseType(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (k.includes('appart') || k === 'apartment' || k.startsWith('appt') || k === 'appt') return 'apartment'
  if (k.includes('villa')) return 'villa'
  if (k.includes('local') || k.includes('commerc')) return 'local'
  if (k.includes('parking') || k.includes('garage')) return 'parking'
  return 'apartment'
}

function normaliseSubtype(raw: string): string | null {
  const k = raw.toUpperCase().replace(/\s/g, '')
  if (['F2', 'F3', 'F4', 'F5', 'F6'].includes(k)) return k
  return null
}

function normaliseStatus(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (k.includes('vendu') || k === 'sold') return 'sold'
  if (k.includes('reserv') || k === 'reserved') return 'reserved'
  if (k.includes('bloqu') || k === 'blocked') return 'blocked'
  return 'available'
}

export const UNIT_IMPORT_FIELDS: CsvFieldSpec[] = [
  { column: 'code', label: 'Code bien', required: true, example: 'A-2-3', hint: 'Référence unique dans le projet' },
  { column: 'type', label: 'Type', required: true, transform: normaliseType, hint: 'apartment / villa / local / parking', example: 'Appartement' },
  { column: 'subtype', label: 'Sous-type (F2/F3...)', transform: (r) => normaliseSubtype(r), example: 'F3' },
  { column: 'building', label: 'Bâtiment', example: 'A' },
  { column: 'floor', label: 'Étage', transform: (r) => parseInteger(r), example: '2' },
  { column: 'surface', label: 'Surface (m²)', transform: (r) => parseNumber(r), example: '85' },
  { column: 'price', label: 'Prix', transform: (r) => parseNumber(r), example: '15000000' },
  { column: 'delivery_date', label: 'Date de livraison', transform: (r) => parseDate(r), example: '30/06/2027' },
  { column: 'status', label: 'Statut', transform: normaliseStatus, hint: 'disponible par défaut', example: 'Disponible' },
]
