import { useState, useMemo } from 'react'
import { CheckCircle } from 'lucide-react'

/* ═══ Types ═══ */

export interface FormField {
  id: string
  type: 'text' | 'tel' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date'
  label: string
  placeholder?: string
  required?: boolean
  options?: string[] // for select
  conditional?: { field_id: string; value: string } // show if another field = value
  maps_to?: string // maps to client field (full_name, phone, email, confirmed_budget, etc.)
}

export interface FormConfig {
  fields: FormField[]
  submit_label?: string
  success_title?: string
  success_message?: string
  legal_text?: string
  button_color?: string
}

interface FormSectionProps {
  title?: string
  accent: string
  slug: string
  content?: FormConfig
  /** Legacy support */
  fields?: string[]
  tenantName?: string
}

// Default fields for backward compatibility
const DEFAULT_FIELDS: FormField[] = [
  { id: 'full_name', type: 'text', label: 'Nom complet', placeholder: 'Votre nom', required: true, maps_to: 'full_name' },
  { id: 'phone', type: 'tel', label: 'Telephone', placeholder: '0555 123 456', required: true, maps_to: 'phone' },
  { id: 'email', type: 'email', label: 'Email', placeholder: 'email@exemple.com', maps_to: 'email' },
  { id: 'budget', type: 'number', label: 'Budget (DA)', placeholder: '10 000 000', maps_to: 'confirmed_budget' },
  { id: 'unit_type', type: 'select', label: 'Type de bien', options: ['Appartement', 'Villa', 'Local commercial', 'Parking'], maps_to: 'unit_type' },
  { id: 'message', type: 'textarea', label: 'Message', placeholder: 'Votre message...', maps_to: 'message' },
]

export function FormSection({ title, accent, slug, content, tenantName }: FormSectionProps) {
  const formConfig = content ?? { fields: DEFAULT_FIELDS }
  const formFields = formConfig.fields?.length > 0 ? formConfig.fields : DEFAULT_FIELDS

  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function setValue(id: string, value: string) {
    setValues(prev => ({ ...prev, [id]: value }))
  }

  // Check visibility (conditional fields)
  const visibleFields = useMemo(() => {
    return formFields.filter(f => {
      if (!f.conditional) return true
      return values[f.conditional.field_id] === f.conditional.value
    })
  }, [formFields, values])

  // Check if form is valid (all required visible fields filled)
  const isValid = visibleFields.filter(f => f.required).every(f => (values[f.id] ?? '').trim() !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    const eventId = crypto.randomUUID()

    try {
      const params = new URLSearchParams(window.location.search)

      // Map form values to client fields
      const payload: Record<string, string | undefined> = {
        slug,
        event_id: eventId,
        source_utm: params.get('utm_source') || params.get('source') || undefined,
        agent_slug: params.get('agent') || undefined,
      }

      // Map known fields
      for (const field of formFields) {
        const val = values[field.id]
        if (!val) continue
        if (field.maps_to) {
          payload[field.maps_to] = val
        }
      }

      // Ensure full_name and phone exist
      if (!payload.full_name) payload.full_name = values[formFields[0]?.id] ?? 'Sans nom'
      if (!payload.phone) payload.phone = values[formFields[1]?.id] ?? '0000000000'

      // Add all custom fields as metadata
      const customAnswers: Record<string, string> = {}
      for (const field of formFields) {
        if (!field.maps_to && values[field.id]) {
          customAnswers[field.label] = values[field.id]
        }
      }
      if (Object.keys(customAnswers).length > 0) {
        payload.message = [
          payload.message ?? '',
          ...Object.entries(customAnswers).map(([q, a]) => `${q}: ${a}`),
        ].filter(Boolean).join('\n')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Submit failed')

      // Fire pixel events
      const w = window as unknown as Record<string, (...args: unknown[]) => void>
      if (w.fbq) w.fbq('track', 'Lead', {}, { eventID: eventId })
      if (w.gtag) w.gtag('event', 'conversion', { event_id: eventId })

      setSubmitted(true)
    } catch {
      alert('Erreur, veuillez reessayer')
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (submitted) {
    const nameField = formFields.find(f => f.maps_to === 'full_name' || f.id === 'full_name')
    const name = nameField ? values[nameField.id] : ''
    return (
      <div className="py-16 px-4" id="landing-form">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
            <CheckCircle className="h-8 w-8" style={{ color: accent }} />
          </div>
          <h2 className="text-2xl font-bold text-[#0A2540]">{formConfig.success_title ?? `Merci ${name} !`}</h2>
          <p className="mt-2 text-[#425466]">{formConfig.success_message ?? 'Votre demande a ete enregistree. Un conseiller vous contactera dans les plus brefs delais.'}</p>
        </div>
      </div>
    )
  }

  const btnColor = formConfig.button_color || accent
  const inputCls = "h-11 w-full rounded-lg border border-[#E3E8EF] bg-white px-4 text-sm text-[#0A2540] outline-none transition-colors focus:border-[color:var(--accent)]"
  const inputStyle = { '--accent': accent } as React.CSSProperties

  return (
    <div className="py-12 px-4" id="landing-form">
      <div className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-lg shadow-black/[0.03]">
          <h2 className="mb-6 text-center text-lg font-semibold text-[#0A2540]">{title ?? 'Demander des informations'}</h2>

          {/* Honeypot */}
          <input type="text" name="website_url" className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="space-y-4">
            {visibleFields.map(field => (
              <div key={field.id}>
                <label className="mb-1 block text-xs font-medium text-[#425466]">
                  {field.label} {field.required && <span className="text-[#CD3D64]">*</span>}
                </label>

                {field.type === 'select' && field.options ? (
                  <select
                    value={values[field.id] ?? ''}
                    onChange={e => setValue(field.id, e.target.value)}
                    required={field.required}
                    className={inputCls}
                  >
                    <option value="">Selectionnez</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={values[field.id] ?? ''}
                    onChange={e => setValue(field.id, e.target.value)}
                    required={field.required}
                    rows={3}
                    placeholder={field.placeholder}
                    className="w-full resize-none rounded-lg border border-[#E3E8EF] bg-white p-4 text-sm text-[#0A2540] outline-none focus:border-[color:var(--accent)]"
                    style={inputStyle}
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values[field.id] === 'true'}
                      onChange={e => setValue(field.id, e.target.checked ? 'true' : '')}
                      className="h-4 w-4 rounded border-[#E3E8EF] accent-[color:var(--accent)]"
                      style={inputStyle}
                    />
                    <span className="text-sm text-[#425466]">{field.placeholder ?? field.label}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.id] ?? ''}
                    onChange={e => setValue(field.id, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    className={inputCls}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-lg text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50"
            style={{ backgroundColor: btnColor }}
          >
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (formConfig.submit_label ?? 'Envoyer ma demande')}
          </button>

          <p className="mt-4 text-center text-[10px] text-[#8898AA]">
            {formConfig.legal_text ?? `En soumettant ce formulaire, vous acceptez d'etre contacte par ${tenantName ?? 'notre equipe'}.`}
          </p>
        </form>
      </div>
    </div>
  )
}
