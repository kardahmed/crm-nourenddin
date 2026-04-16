// Internal helper for edge functions to call the send-email function
// Uses fetch to the same Supabase project URL to reuse Resend integration + logging.

import type { TemplateName } from './email-templates.ts'

export async function sendEmailInternal(params: {
  to: string
  template: TemplateName
  template_data: Record<string, unknown>
  client_id?: string
  subject?: string
}): Promise<{ sent: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        template: params.template,
        template_data: params.template_data,
        
        client_id: params.client_id,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { sent: false, error: data.error ?? `HTTP ${res.status}` }
    }

    const data = await res.json()
    return { sent: data.sent ?? false }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) }
  }
}
