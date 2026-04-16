import type { CsvFieldSpec } from '@/components/common/CsvImportModal'

/** Normalise incoming pipeline stage labels (FR / EN / old CRM tokens). */
function normaliseStage(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (!k) return 'accueil'
  if (k.includes('accueil') || k.includes('nouveau') || k === 'lead') return 'accueil'
  if (k.includes('a gerer') || k.includes('à gerer') || k.includes('a_gerer')) return 'visite_a_gerer'
  if (k.includes('confirm')) return 'visite_confirmee'
  if (k.includes('termin')) return 'visite_terminee'
  if (k.includes('nego')) return 'negociation'
  if (k.includes('reserv')) return 'reservation'
  if (k.includes('vente') || k.includes('vendu') || k.includes('gagn')) return 'vente'
  if (k.includes('relanc')) return 'relancement'
  if (k.includes('perdu') || k.includes('lost')) return 'perdue'
  return 'accueil'
}

/** Normalise source labels. */
function normaliseSource(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (!k) return 'autre'
  if (k.includes('facebook')) return 'facebook_ads'
  if (k.includes('instagram')) return 'instagram_ads'
  if (k.includes('google')) return 'google_ads'
  if (k.includes('appel') || k.includes('call')) return 'appel_entrant'
  if (k.includes('recept')) return 'reception'
  if (k.includes('bouche') || k.includes('parrain')) return 'bouche_a_oreille'
  if (k.includes('ref') && k.includes('client')) return 'reference_client'
  if (k.includes('site') || k.includes('web')) return 'site_web'
  if (k.includes('portail')) return 'portail_immobilier'
  return 'autre'
}

function normaliseInterest(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (k.includes('haut') || k.includes('high') || k.includes('fort')) return 'high'
  if (k.includes('bas') || k.includes('low') || k.includes('faible')) return 'low'
  return 'medium'
}

function normaliseClientType(raw: string): string {
  const k = raw.toLowerCase().trim()
  if (k.includes('entrep') || k.includes('company') || k.includes('société')) return 'company'
  return 'individual'
}

function parseNumber(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  // Try DD/MM/YYYY then ISO
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

export const CLIENT_IMPORT_FIELDS: CsvFieldSpec[] = [
  { column: 'full_name', label: 'Nom complet', required: true },
  { column: 'phone', label: 'Téléphone', required: true },
  { column: 'email', label: 'Email' },
  { column: 'nin_cin', label: 'NIN / CIN' },
  { column: 'client_type', label: 'Type de client', transform: normaliseClientType, hint: 'Particulier / Entreprise' },
  { column: 'source', label: 'Source', required: true, transform: normaliseSource, hint: 'facebook, google, site web, etc.' },
  { column: 'pipeline_stage', label: 'Étape pipeline', transform: normaliseStage, hint: 'accueil par défaut' },
  { column: 'interest_level', label: 'Niveau d\'intérêt', transform: normaliseInterest },
  { column: 'confirmed_budget', label: 'Budget confirmé', transform: (r) => parseNumber(r) },
  { column: 'profession', label: 'Profession' },
  { column: 'address', label: 'Adresse' },
  { column: 'nationality', label: 'Nationalité', hint: 'Code pays, défaut DZ' },
  { column: 'birth_date', label: 'Date de naissance', transform: (r) => parseDate(r) },
  { column: 'notes', label: 'Notes' },
]
