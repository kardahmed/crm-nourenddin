import { useState, useMemo } from 'react'
import { Upload, AlertCircle, CheckCircle, X, FileJson, FileText, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useProjects } from '@/hooks/useProjects'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

type Step = 'paste' | 'map' | 'import' | 'done'

interface BulkImportUnitsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ParsedUnit {
  /** Fields mapped to new schema. project_id is the ORIGINAL id until mapping is applied. */
  row: Record<string, unknown>
  originalProjectId: string
  rowIdx: number
}

const BATCH_SIZE = 50
const VALID_TYPES = ['apartment', 'villa', 'local', 'parking']
const VALID_SUBTYPES = ['F2', 'F3', 'F4', 'F5', 'F6']
const VALID_STATUS = ['available', 'reserved', 'sold', 'blocked']

function parseNumberLoose(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(String(raw).replace(/,/g, '.'))
  return Number.isFinite(n) ? n : null
}

function mapType(raw: unknown): string {
  const k = String(raw ?? '').toLowerCase().trim()
  if (!k) return 'apartment'
  if (k === 'duplex') return 'apartment' // old CRM used 'duplex', new enum doesn't
  if (VALID_TYPES.includes(k)) return k
  if (k.includes('appart')) return 'apartment'
  if (k.includes('villa')) return 'villa'
  if (k.includes('local') || k.includes('commerc')) return 'local'
  if (k.includes('parking') || k.includes('garage')) return 'parking'
  return 'apartment'
}

function mapSubtype(raw: unknown): string | null {
  const k = String(raw ?? '').toUpperCase().replace(/\s/g, '')
  return VALID_SUBTYPES.includes(k) ? k : null
}

function mapStatus(raw: unknown): string {
  const k = String(raw ?? '').toLowerCase().trim()
  return VALID_STATUS.includes(k) ? k : 'available'
}

function normalizeDate(raw: unknown): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * Convert an arbitrary legacy-CRM unit row into the current `units` schema.
 * Handles the old field names (unit_type/surface_area/total_price/expected_delivery_date)
 * and drops unknown keys.
 */
function transformRow(raw: Record<string, unknown>): Record<string, unknown> {
  const code = String(raw.code ?? raw.name ?? '').trim()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : undefined,
    code,
    type: mapType(raw.type ?? raw.unit_type),
    subtype: mapSubtype(raw.subtype ?? raw.unit_subtype),
    building: raw.building ? String(raw.building).trim() || null : null,
    floor: parseNumberLoose(raw.floor) ?? null,
    surface: parseNumberLoose(raw.surface ?? raw.surface_area),
    price: parseNumberLoose(raw.price ?? raw.total_price),
    delivery_date: normalizeDate(raw.delivery_date ?? raw.expected_delivery_date),
    plan_2d_url: raw.plan_2d_url && String(raw.plan_2d_url).trim() ? String(raw.plan_2d_url).trim() : null,
    status: mapStatus(raw.status),
  }
}

export function BulkImportUnitsModal({ isOpen, onClose }: BulkImportUnitsModalProps) {
  const qc = useQueryClient()
  const { projects } = useProjects()

  const [step, setStep] = useState<Step>('paste')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedUnit[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [projectMapping, setProjectMapping] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null)

  const uniqueOldProjectIds = useMemo(() => {
    if (!parsed) return []
    return Array.from(new Set(parsed.map((p) => p.originalProjectId).filter(Boolean)))
  }, [parsed])

  const mappingReady = useMemo(() => {
    return uniqueOldProjectIds.every((id) => projectMapping[id])
  }, [uniqueOldProjectIds, projectMapping])

  function reset() {
    setStep('paste')
    setRawText('')
    setParsed(null)
    setParseError(null)
    setProjectMapping({})
    setProgress(0)
    setResult(null)
  }

  function closeAndReset() {
    reset()
    onClose()
  }

  function parseInput() {
    const text = rawText.trim()
    if (!text) {
      setParseError('Colle du JSON ou CSV pour continuer.')
      return
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      setParseError('JSON invalide — vérifie la syntaxe.')
      return
    }
    if (!Array.isArray(json)) {
      setParseError('Le JSON doit être un tableau d\'objets.')
      return
    }
    if (json.length === 0) {
      setParseError('Tableau vide — rien à importer.')
      return
    }

    const rows: ParsedUnit[] = []
    const seenProjectIds = new Set<string>()
    const existingProjectIds = new Set(projects.map((p) => p.id))
    const autoMap: Record<string, string> = {}

    for (let i = 0; i < json.length; i++) {
      const raw = json[i] as Record<string, unknown>
      if (typeof raw !== 'object' || raw === null) continue
      const originalProjectId = String(raw.project_id ?? '').trim()
      const transformed = transformRow(raw)
      if (!transformed.code) continue
      rows.push({ row: transformed, originalProjectId, rowIdx: i })
      if (originalProjectId) {
        seenProjectIds.add(originalProjectId)
        if (existingProjectIds.has(originalProjectId)) {
          autoMap[originalProjectId] = originalProjectId
        }
      }
    }

    if (rows.length === 0) {
      setParseError('Aucune ligne valide (code manquant sur toutes les lignes).')
      return
    }

    setParseError(null)
    setParsed(rows)
    setProjectMapping(autoMap)
    setStep('map')
  }

  async function runImport() {
    if (!parsed) return
    setStep('import')
    setProgress(0)

    const rowsToInsert = parsed.map(({ row, originalProjectId }) => ({
      ...row,
      project_id: projectMapping[originalProjectId],
    }))

    const errors: string[] = []
    let inserted = 0

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE)
      const { error, data } = await supabase.from('units').insert(batch as never).select('id')
      if (error) {
        errors.push(`Lot ${Math.floor(i / BATCH_SIZE) + 1} : ${error.message}`)
      } else {
        inserted += data?.length ?? batch.length
      }
      setProgress(Math.round(((i + batch.length) / rowsToInsert.length) * 100))
    }

    setResult({ inserted, errors })
    setStep('done')
    if (inserted > 0) {
      qc.invalidateQueries({ queryKey: ['units'] })
      toast.success(`${inserted} unité(s) importée(s)`)
    }
  }

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
    [projects],
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeAndReset}
      title="Import en masse — Unités"
      subtitle="Colle un tableau JSON exporté de l'ancien CRM"
      size="lg"
    >
      {step === 'paste' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-immo-accent-blue/30 bg-immo-accent-blue/5 p-3 text-xs text-immo-text-secondary">
            <div className="mb-1 flex items-center gap-2">
              <FileJson className="h-3.5 w-3.5 text-immo-accent-blue" />
              <p className="font-semibold text-immo-text-primary">Format attendu</p>
            </div>
            <p>
              Tableau JSON d'objets avec au minimum <code className="rounded bg-immo-bg-primary px-1 py-0.5 font-mono text-[10px]">code</code>,{' '}
              <code className="rounded bg-immo-bg-primary px-1 py-0.5 font-mono text-[10px]">project_id</code>. Les champs de l'ancien
              CRM (<code className="rounded bg-immo-bg-primary px-1 py-0.5 font-mono text-[10px]">unit_type</code>,{' '}
              <code className="rounded bg-immo-bg-primary px-1 py-0.5 font-mono text-[10px]">surface_area</code>,{' '}
              <code className="rounded bg-immo-bg-primary px-1 py-0.5 font-mono text-[10px]">total_price</code>) sont auto-mappés.
            </p>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder='[{"code": "A101", "project_id": "...", "unit_type": "apartment", ...}]'
            className="h-60 w-full resize-none rounded-lg border border-immo-border-default bg-immo-bg-primary p-3 font-mono text-xs text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:outline-none"
          />

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-immo-status-red/30 bg-immo-status-red/5 p-3 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-immo-status-red" />
              <p className="text-immo-status-red">{parseError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={closeAndReset} className="text-immo-text-secondary">
              Annuler
            </Button>
            <Button
              onClick={parseInput}
              disabled={!rawText.trim()}
              className="bg-immo-accent-green text-immo-bg-primary hover:bg-immo-accent-green/90"
            >
              <Upload className="mr-1.5 h-4 w-4" /> Analyser
            </Button>
          </div>
        </div>
      )}

      {step === 'map' && parsed && (
        <div className="space-y-4">
          <div className="rounded-lg border border-immo-border-default bg-immo-bg-card p-3 text-xs">
            <span className="font-semibold text-immo-text-primary">{parsed.length}</span>{' '}
            <span className="text-immo-text-muted">
              unité(s) détectée(s) — {uniqueOldProjectIds.length} projet(s) distinct(s)
            </span>
          </div>

          {uniqueOldProjectIds.length === 0 ? (
            <div className="rounded-lg border border-immo-status-red/30 bg-immo-status-red/5 p-3 text-xs text-immo-status-red">
              Aucun <code>project_id</code> trouvé dans les données.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-immo-text-primary">
                Mapper chaque ancien projet vers un projet existant :
              </p>
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {uniqueOldProjectIds.map((oldId) => {
                  const count = parsed.filter((p) => p.originalProjectId === oldId).length
                  return (
                    <div
                      key={oldId}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-immo-border-default bg-immo-bg-card p-3"
                    >
                      <div>
                        <p className="truncate font-mono text-[11px] text-immo-text-primary" title={oldId}>
                          {oldId.slice(0, 8)}…
                        </p>
                        <p className="text-[10px] text-immo-text-muted">{count} unité(s)</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-immo-text-muted" />
                      <select
                        value={projectMapping[oldId] ?? ''}
                        onChange={(e) => setProjectMapping((m) => ({ ...m, [oldId]: e.target.value }))}
                        className="h-8 w-full rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
                      >
                        <option value="">— Choisir un projet —</option>
                        {projectOptions.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={() => setStep('paste')} className="text-immo-text-secondary">
              Retour
            </Button>
            <Button
              onClick={runImport}
              disabled={!mappingReady}
              className="bg-immo-accent-green text-immo-bg-primary hover:bg-immo-accent-green/90"
            >
              Importer {parsed.length} unité(s)
            </Button>
          </div>
        </div>
      )}

      {step === 'import' && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-immo-accent-green border-t-transparent" />
          <p className="text-sm text-immo-text-primary">Import en cours… {progress}%</p>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-immo-border-default">
            <div
              className="h-full bg-immo-accent-green transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-immo-accent-green/30 bg-immo-accent-green/5 p-6 text-center">
            <CheckCircle className="h-12 w-12 text-immo-accent-green" />
            <p className="text-lg font-bold text-immo-text-primary">Import terminé</p>
            <p className="text-sm text-immo-text-secondary">
              <span className="font-semibold text-immo-accent-green">{result.inserted}</span> unité(s)
              importée(s)
              {result.errors.length > 0 && (
                <>
                  {' '}
                  — <span className="text-immo-status-red">{result.errors.length} erreur(s)</span>
                </>
              )}
            </p>
          </div>

          {result.errors.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-lg border border-immo-status-red/20 bg-immo-bg-primary p-3">
              <div className="mb-2 flex items-center gap-2">
                <X className="h-3.5 w-3.5 text-immo-status-red" />
                <p className="text-xs font-semibold text-immo-status-red">Erreurs</p>
              </div>
              <ul className="space-y-1 text-[11px] text-immo-text-muted">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
                {result.errors.length > 20 && (
                  <li className="italic">…et {result.errors.length - 20} autre(s)</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={reset} className="text-immo-text-secondary">
              Nouvel import
            </Button>
            <Button
              onClick={closeAndReset}
              className="bg-immo-accent-green text-immo-bg-primary hover:bg-immo-accent-green/90"
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
