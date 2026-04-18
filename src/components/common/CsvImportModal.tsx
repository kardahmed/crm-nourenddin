import { useState, useMemo } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowRight, Download } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

/**
 * Generic CSV import modal used for bulk client / project / unit migration
 * from a legacy CRM. The parent provides an `entity` key + a field config
 * describing which CRM columns exist (label + db column + required flag
 * + optional transformer). The modal walks the user through:
 *   1. drop / pick a .csv or .tsv file
 *   2. map CSV headers → CRM columns
 *   3. review row count + errors
 *   4. bulk insert into `table`
 */

export interface CsvFieldSpec {
  /** Database column name */
  column: string
  /** Human label shown in the mapping step */
  label: string
  /** If true, the field must be mapped to a CSV column */
  required?: boolean
  /** Optional transformer: (csvCell) => dbValue. Receives empty string '' when empty. */
  transform?: (raw: string) => unknown
  /** Hint shown under the dropdown */
  hint?: string
  /** Example value shown in the downloadable template */
  example?: string
}

export interface CsvImportProps<_T extends object = object> {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Supabase table name to insert into */
  table: string
  /** List of importable fields */
  fields: CsvFieldSpec[]
  /** Called after each batch to let caller augment the row (e.g. inject agent_id) */
  defaults?: () => Promise<Record<string, unknown>> | Record<string, unknown>
  /** Called once the import succeeds */
  onSuccess?: (insertedCount: number) => void
  /** Filename stem for the downloadable template (no extension) */
  templateName?: string
}

type Step = 'upload' | 'map' | 'import' | 'done'

interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

const BATCH_SIZE = 50

function parseCsv(text: string): ParsedCsv {
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ','
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const cells: string[] = []
    let current = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"' && inQuote && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (c === '"') {
        inQuote = !inQuote
      } else if (c === delimiter && !inQuote) {
        cells.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    cells.push(current.trim())
    return cells
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function buildTemplateCsv(fields: CsvFieldSpec[]): string {
  const header = fields.map((f) => escapeCsv(f.label)).join(',')
  const example = fields.map((f) => escapeCsv(f.example ?? '')).join(',')
  return `${header}\n${example}\n`
}

export function CsvImportModal({
  isOpen, onClose, title, subtitle, table, fields, defaults, onSuccess, templateName,
}: CsvImportProps) {
  const [step, setStep] = useState<Step>('upload')
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({}) // db column -> csv header
  const [, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null)

  function reset() {
    setStep('upload')
    setCsv(null)
    setMapping({})
    setImporting(false)
    setProgress(0)
    setResult(null)
  }

  function closeAndReset() {
    reset()
    onClose()
  }

  function downloadTemplate() {
    const csv = buildTemplateCsv(fields)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateName ?? table}-modele.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Modèle téléchargé')
  }

  async function handleFile(file: File) {
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      toast.error('Format non supporté (CSV ou TSV uniquement)')
      return
    }
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      toast.error('Fichier vide ou invalide')
      return
    }
    setCsv(parsed)
    // Auto-guess mapping: exact match on label or column name
    const guess: Record<string, string> = {}
    for (const field of fields) {
      const match = parsed.headers.find((h) => {
        const n = h.toLowerCase().trim()
        return n === field.column || n === field.label.toLowerCase() || n === field.label.toLowerCase().replace(/[^a-z]/g, '')
      })
      if (match) guess[field.column] = match
    }
    setMapping(guess)
    setStep('map')
  }

  const requiredMissing = useMemo(() => {
    return fields.filter((f) => f.required && !mapping[f.column])
  }, [fields, mapping])

  async function runImport() {
    if (!csv) return
    setImporting(true)
    setStep('import')
    setProgress(0)

    const defaultValues = defaults ? await defaults() : {}
    const errors: string[] = []
    let inserted = 0

    const rows = csv.rows.map((cells, rowIdx) => {
      const row: Record<string, unknown> = { ...defaultValues }
      for (const field of fields) {
        const csvHeader = mapping[field.column]
        if (!csvHeader) continue
        const colIdx = csv.headers.indexOf(csvHeader)
        const raw = colIdx >= 0 ? (cells[colIdx] ?? '') : ''
        if (!raw && !field.required) continue
        try {
          row[field.column] = field.transform ? field.transform(raw) : raw
        } catch (err) {
          errors.push(`Ligne ${rowIdx + 2} · ${field.label} : ${(err as Error).message}`)
        }
      }
      return row
    })

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const { error, data } = await supabase.from(table).insert(batch as never).select('id')
      if (error) {
        errors.push(`Lot ${Math.floor(i / BATCH_SIZE) + 1} : ${error.message}`)
      } else {
        inserted += data?.length ?? batch.length
      }
      setProgress(Math.round(((i + batch.length) / rows.length) * 100))
    }

    setResult({ inserted, errors })
    setImporting(false)
    setStep('done')
    if (inserted > 0) onSuccess?.(inserted)
  }

  return (
    <Modal isOpen={isOpen} onClose={closeAndReset} title={title} subtitle={subtitle ?? 'Importer des données depuis un fichier CSV'} size="lg">
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Template download CTA */}
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex w-full items-center gap-3 rounded-lg border border-immo-accent-blue/30 bg-immo-accent-blue/5 p-3 text-left transition-colors hover:bg-immo-accent-blue/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-immo-accent-blue/15">
              <Download className="h-4 w-4 text-immo-accent-blue" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-immo-text-primary">Télécharger le modèle CSV</p>
              <p className="text-[11px] text-immo-text-muted">
                Pré-rempli avec les en-têtes attendues + une ligne d'exemple — remplissez-le puis revenez ici.
              </p>
            </div>
          </button>

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-immo-border-default p-10 transition-colors hover:border-immo-accent-green hover:bg-immo-accent-green/5">
            <Upload className="h-10 w-10 text-immo-text-muted" />
            <div className="text-center">
              <p className="text-sm font-semibold text-immo-text-primary">Cliquez pour choisir un fichier</p>
              <p className="mt-1 text-xs text-immo-text-muted">CSV ou TSV — la première ligne doit être les en-têtes</p>
            </div>
            <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="hidden" />
          </label>

          <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary p-4 text-[11px] text-immo-text-muted">
            <p className="mb-2 font-semibold text-immo-text-secondary">💡 Astuce</p>
            <p>Vous pouvez aussi exporter vos données depuis un ancien CRM en CSV, puis associer manuellement chaque colonne au champ correspondant à l'étape suivante.</p>
          </div>
        </div>
      )}

      {step === 'map' && csv && (
        <div className="space-y-4">
          <div className="rounded-lg border border-immo-border-default bg-immo-bg-card p-3 text-xs">
            <span className="font-semibold text-immo-text-primary">{csv.rows.length}</span>{' '}
            <span className="text-immo-text-muted">ligne(s) détectée(s) — {csv.headers.length} colonne(s)</span>
          </div>

          <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {fields.map((field) => (
              <div key={field.column} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-immo-border-default bg-immo-bg-card p-3">
                <div>
                  <p className="text-sm font-medium text-immo-text-primary">
                    {field.label}{field.required && <span className="ml-1 text-immo-status-red">*</span>}
                  </p>
                  {field.hint && <p className="text-[10px] text-immo-text-muted">{field.hint}</p>}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-immo-text-muted" />
                <select
                  value={mapping[field.column] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [field.column]: e.target.value }))}
                  className="h-8 w-full rounded-md border border-immo-border-default bg-immo-bg-primary px-2 text-xs text-immo-text-primary"
                >
                  <option value="">— Ignorer —</option>
                  {csv.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {requiredMissing.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-immo-status-red/30 bg-immo-status-red/5 p-3 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-immo-status-red" />
              <div>
                <p className="font-semibold text-immo-status-red">Champs obligatoires non mappés :</p>
                <p className="text-immo-text-secondary">{requiredMissing.map((f) => f.label).join(', ')}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={() => setStep('upload')} className="text-immo-text-secondary">Retour</Button>
            <Button onClick={runImport} disabled={requiredMissing.length > 0} className="bg-immo-accent-green text-immo-bg-primary hover:bg-immo-accent-green/90">
              Importer {csv.rows.length} ligne(s)
            </Button>
          </div>
        </div>
      )}

      {step === 'import' && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-immo-accent-green border-t-transparent" />
          <p className="text-sm text-immo-text-primary">Import en cours… {progress}%</p>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-immo-border-default">
            <div className="h-full bg-immo-accent-green transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-immo-accent-green/30 bg-immo-accent-green/5 p-6 text-center">
            <CheckCircle className="h-12 w-12 text-immo-accent-green" />
            <p className="text-lg font-bold text-immo-text-primary">Import terminé</p>
            <p className="text-sm text-immo-text-secondary">
              <span className="font-semibold text-immo-accent-green">{result.inserted}</span> ligne(s) importée(s){result.errors.length > 0 && <> — <span className="text-immo-status-red">{result.errors.length} erreur(s)</span></>}
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
                  <li key={i} className="flex gap-2"><FileText className="h-3 w-3 shrink-0" /><span>{e}</span></li>
                ))}
                {result.errors.length > 20 && <li className="italic">…et {result.errors.length - 20} autre(s)</li>}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={reset} className="text-immo-text-secondary">Nouvel import</Button>
            <Button onClick={closeAndReset} className="bg-immo-accent-green text-immo-bg-primary hover:bg-immo-accent-green/90">Fermer</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
