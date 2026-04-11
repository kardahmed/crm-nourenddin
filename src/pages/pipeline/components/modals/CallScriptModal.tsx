import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Phone, Clock, Sparkles, CheckCircle, Lightbulb, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PIPELINE_STAGES } from '@/types'
import type { PipelineStage } from '@/types'
import toast from 'react-hot-toast'

interface ScriptQuestion {
  id: string
  question: string
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'date'
  options?: string[]
  maps_to?: string
}

interface CallScriptModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  clientPhone: string
  clientStage: PipelineStage
  tenantId: string
  agentId: string
}

export function CallScriptModal({
  isOpen, onClose, clientId, clientName, clientPhone, clientStage, tenantId, agentId,
}: CallScriptModalProps) {
  const qc = useQueryClient()
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<'qualified' | 'callback' | 'not_interested'>('qualified')
  const [saving, setSaving] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // Timer
  useEffect(() => {
    if (isOpen) {
      setTimer(0)
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isOpen])

  // Fetch script (AI or template)
  const { data: script, isLoading: loadingScript } = useQuery({
    queryKey: ['call-script', clientId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-call-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ client_id: clientId }),
      })

      if (!response.ok) {
        // Fallback: load default script from DB
        const { data } = await supabase.from('call_scripts')
          .select('*').eq('tenant_id', tenantId).eq('pipeline_stage', clientStage).eq('is_active', true).maybeSingle()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any
        if (d) return {
          mode: 'template' as const,
          intro: (d.intro_text ?? '').replace(/\[nom\]/g, clientName),
          questions: d.questions as ScriptQuestion[],
          talking_points: [] as string[],
          outro: (d.outro_text ?? '').replace(/\[nom\]/g, clientName),
          suggested_action: null as string | null,
          script_id: d.id as string | null,
        }

        return null
      }

      return await response.json() as {
        mode: 'ai' | 'template'
        intro: string
        questions: ScriptQuestion[]
        talking_points: string[]
        outro: string
        suggested_action: string | null
        script_id: string | null
      }
    },
    enabled: isOpen,
  })

  function setAnswer(qId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
    setCheckedQuestions(prev => new Set([...prev, qId]))
  }

  function toggleCheckbox(qId: string, option: string) {
    const current = (answers[qId] as string[]) ?? []
    const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option]
    setAnswer(qId, next)
  }

  async function handleSave() {
    setSaving(true)
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      // 1. Save call response
      await supabase.from('call_responses').insert({
        tenant_id: tenantId, client_id: clientId, agent_id: agentId,
        script_id: script?.script_id ?? null,
        responses: answers,
        duration_seconds: timer,
        result,
        ai_summary: notes || null,
        ai_suggestion: script?.suggested_action ?? null,
      } as never)

      // 2. Update client fields from mapped answers
      const clientUpdate: Record<string, unknown> = {}
      for (const q of script?.questions ?? []) {
        if (q.maps_to && answers[q.id]) {
          const val = answers[q.id]
          if (q.maps_to === 'confirmed_budget') clientUpdate.confirmed_budget = Number(val) || null
          else if (q.maps_to === 'desired_unit_types') clientUpdate.desired_unit_types = Array.isArray(val) ? val : [val]
          else if (q.maps_to === 'interest_level') {
            const map: Record<string, string> = { 'Oui, urgent': 'high', 'Oui, pas presse': 'medium', 'Juste en veille': 'low', 'Chaud': 'high', 'Tiede': 'medium', 'Froid': 'low' }
            clientUpdate.interest_level = map[val as string] ?? val
          } else if (q.maps_to === 'payment_method') {
            const map: Record<string, string> = { 'Comptant': 'cash', 'Credit bancaire': 'bank_loan', 'Mixte': 'mixed' }
            clientUpdate.payment_method = map[val as string] ?? 'installments'
          }
        }
      }

      // Add notes
      if (notes) {
        const { data: currentClient } = await supabase.from('clients').select('notes').eq('id', clientId).single()
        const existingNotes = (currentClient as { notes: string | null } | null)?.notes ?? ''
        clientUpdate.notes = existingNotes ? `${existingNotes}\n\n[Appel ${new Date().toLocaleDateString('fr')}] ${notes}` : `[Appel ${new Date().toLocaleDateString('fr')}] ${notes}`
      }

      if (Object.keys(clientUpdate).length > 0) {
        await supabase.from('clients').update(clientUpdate as never).eq('id', clientId)
      }

      // 3. Log in history
      const answeredCount = Object.keys(answers).length
      const totalQuestions = script?.questions?.length ?? 0
      await supabase.from('history').insert({
        tenant_id: tenantId, client_id: clientId, agent_id: agentId,
        type: 'call',
        title: `Appel guide ${Math.floor(timer / 60)}min — ${result === 'qualified' ? 'Qualifie' : result === 'callback' ? 'A rappeler' : 'Pas interesse'} (${answeredCount}/${totalQuestions} questions)`,
        metadata: { duration: timer, result, answers_count: answeredCount, mode: script?.mode },
      } as never)

      toast.success('Appel enregistre et fiche client mise a jour')
      qc.invalidateQueries({ queryKey: ['client-detail'] })
      qc.invalidateQueries({ queryKey: ['client-history'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const stage = PIPELINE_STAGES[clientStage]
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-immo-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-immo-border-default bg-immo-bg-card px-6 py-3">
        <div className="flex items-center gap-4">
          <Phone className="h-5 w-5 text-immo-accent-green" />
          <div>
            <h2 className="text-sm font-bold text-immo-text-primary">{clientName}</h2>
            <div className="flex items-center gap-2 text-xs text-immo-text-muted">
              <span>{clientPhone}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: stage.color + '15', color: stage.color }}>{stage.label}</span>
              {script?.mode === 'ai' && <span className="flex items-center gap-1 text-purple-500"><Sparkles className="h-3 w-3" /> IA</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-immo-accent-green/10 px-3 py-1.5">
            <Clock className="h-4 w-4 text-immo-accent-green" />
            <span className="font-mono text-sm font-bold text-immo-accent-green">{formatTime(timer)}</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-immo-text-muted hover:bg-immo-bg-card-hover">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Script */}
        <div className="flex-[3] overflow-y-auto border-r border-immo-border-default p-6">
          {loadingScript ? (
            <div className="flex items-center gap-3 py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-immo-accent-green border-t-transparent" />
              <span className="text-sm text-immo-text-muted">Generation du script...</span>
            </div>
          ) : !script ? (
            <p className="py-8 text-center text-sm text-immo-text-muted">Aucun script disponible pour cette etape</p>
          ) : (
            <div className="space-y-6">
              {/* Intro */}
              {script.intro && (
                <div className="rounded-xl border border-immo-accent-green/20 bg-immo-accent-green/5 p-4">
                  <p className="text-sm leading-relaxed text-immo-text-primary">{script.intro}</p>
                </div>
              )}

              {/* Questions */}
              <div className="space-y-4">
                {script.questions.map((q, i) => {
                  const answered = checkedQuestions.has(q.id)
                  return (
                    <div key={q.id} className={`rounded-xl border p-4 transition-all ${answered ? 'border-immo-accent-green/30 bg-immo-accent-green/5' : 'border-immo-border-default'}`}>
                      <div className="mb-3 flex items-start gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${answered ? 'bg-immo-accent-green text-white' : 'bg-immo-bg-card-hover text-immo-text-muted'}`}>
                          {answered ? '✓' : i + 1}
                        </span>
                        <p className="text-sm font-medium text-immo-text-primary">{q.question}</p>
                      </div>

                      {/* Input based on type */}
                      {q.type === 'text' && (
                        <Input value={(answers[q.id] as string) ?? ''} onChange={e => setAnswer(q.id, e.target.value)} placeholder="Reponse..." className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary text-sm" />
                      )}
                      {q.type === 'number' && (
                        <Input type="number" value={(answers[q.id] as string) ?? ''} onChange={e => setAnswer(q.id, e.target.value)} placeholder="0" className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary text-sm" />
                      )}
                      {q.type === 'date' && (
                        <Input type="date" value={(answers[q.id] as string) ?? ''} onChange={e => setAnswer(q.id, e.target.value)} className="border-immo-border-default bg-immo-bg-primary text-immo-text-primary text-sm" />
                      )}
                      {(q.type === 'select' || q.type === 'radio') && q.options && (
                        <div className="flex flex-wrap gap-2">
                          {q.options.map(opt => (
                            <button key={opt} onClick={() => setAnswer(q.id, opt)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                answers[q.id] === opt
                                  ? 'border-immo-accent-green bg-immo-accent-green/10 text-immo-accent-green'
                                  : 'border-immo-border-default text-immo-text-secondary hover:border-immo-text-muted'
                              }`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.type === 'checkbox' && q.options && (
                        <div className="flex flex-wrap gap-2">
                          {q.options.map(opt => {
                            const checked = ((answers[q.id] as string[]) ?? []).includes(opt)
                            return (
                              <button key={opt} onClick={() => toggleCheckbox(q.id, opt)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                  checked
                                    ? 'border-immo-accent-green bg-immo-accent-green/10 text-immo-accent-green'
                                    : 'border-immo-border-default text-immo-text-secondary hover:border-immo-text-muted'
                                }`}>
                                <span className={`h-3 w-3 rounded border ${checked ? 'border-immo-accent-green bg-immo-accent-green' : 'border-immo-border-default'}`}>
                                  {checked && <span className="block text-[8px] text-white text-center">✓</span>}
                                </span>
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Talking points */}
              {script.talking_points.length > 0 && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-semibold text-purple-700">Arguments de vente IA</span>
                  </div>
                  <ul className="space-y-1">
                    {script.talking_points.map((tp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-purple-600">
                        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" /> {tp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Outro */}
              {script.outro && (
                <div className="rounded-xl border border-immo-border-default bg-immo-bg-card-hover p-4">
                  <p className="text-sm text-immo-text-secondary">{script.outro}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Responses summary */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto bg-immo-bg-card p-6">
          <h3 className="mb-4 text-sm font-bold text-immo-text-primary">Recapitulatif</h3>

          {/* Answers summary */}
          <div className="mb-4 space-y-2">
            {script?.questions.filter(q => answers[q.id]).map(q => (
              <div key={q.id} className="rounded-lg bg-immo-bg-primary p-2.5">
                <p className="text-[10px] text-immo-text-muted">{q.question}</p>
                <p className="text-xs font-medium text-immo-text-primary">
                  {Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(', ') : answers[q.id]}
                </p>
              </div>
            )) ?? null}
            {Object.keys(answers).length === 0 && (
              <p className="py-4 text-center text-xs text-immo-text-muted">Les reponses apparaitront ici</p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="mb-1 block text-[10px] font-medium text-immo-text-muted">Notes supplementaires</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Impressions, remarques..."
              className="w-full resize-none rounded-lg border border-immo-border-default bg-immo-bg-primary p-3 text-xs text-immo-text-primary placeholder:text-immo-text-muted focus:border-immo-accent-green focus:outline-none" />
          </div>

          {/* Result */}
          <div className="mb-4">
            <label className="mb-2 block text-[10px] font-medium text-immo-text-muted">Resultat de l'appel</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'qualified' as const, label: 'Qualifie', color: 'text-immo-accent-green border-immo-accent-green/30 bg-immo-accent-green/5' },
                { value: 'callback' as const, label: 'A rappeler', color: 'text-immo-status-orange border-immo-status-orange/30 bg-immo-status-orange/5' },
                { value: 'not_interested' as const, label: 'Pas interesse', color: 'text-immo-status-red border-immo-status-red/30 bg-immo-status-red/5' },
              ]).map(r => (
                <button key={r.value} onClick={() => setResult(r.value)}
                  className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition-all ${result === r.value ? r.color : 'border-immo-border-default text-immo-text-muted'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI suggestion */}
          {script?.suggested_action && (
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <p className="text-[10px] font-medium text-purple-500">Suggestion IA</p>
              <p className="text-xs font-medium text-purple-700">{script.suggested_action}</p>
            </div>
          )}

          {/* Save button */}
          <div className="mt-auto">
            <Button onClick={handleSave} disabled={saving} className="w-full bg-immo-accent-green font-semibold text-white hover:bg-immo-accent-green/90">
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> :
                <><CheckCircle className="mr-1.5 h-4 w-4" /> Sauvegarder et fermer</>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
