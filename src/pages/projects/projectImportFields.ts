import type { CsvFieldSpec } from '@/components/common/CsvImportModal'

function parseNumber(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
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

function normaliseStatus(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (k.includes('archiv')) return 'archived'
  if (k.includes('inactif') || k.includes('inactive') || k.includes('suspend')) return 'inactive'
  return 'active'
}

export const PROJECT_IMPORT_FIELDS: CsvFieldSpec[] = [
  { column: 'name', label: 'Nom du projet', required: true, example: 'Résidence Les Oliviers' },
  { column: 'code', label: 'Code projet', required: true, example: 'PRJ-001', hint: 'Doit être unique' },
  { column: 'description', label: 'Description', example: 'Résidence standing haut de gamme, vue mer' },
  { column: 'location', label: 'Localisation', example: 'Hydra, Alger' },
  { column: 'delivery_date', label: 'Date de livraison', transform: (r) => parseDate(r), example: '30/06/2027' },
  { column: 'avg_price_per_unit', label: 'Prix moyen / unité', transform: (r) => parseNumber(r), example: '18000000' },
  { column: 'status', label: 'Statut', transform: normaliseStatus, hint: 'actif par défaut', example: 'Actif' },
]
