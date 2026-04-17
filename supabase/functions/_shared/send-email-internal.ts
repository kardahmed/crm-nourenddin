// Internal helper for edge functions to call the send-email function.
// Uses a short-lived HMAC token (see internalToken.ts) instead of the
// service role key so the long-lived secret never travels over the
// network or lands in edge-function request logs.

import type { TemplateName } from './email-templates.ts'
import { signInternalToken } from './internalToken.ts'

export async function sendEmailInternal(params: {
  to: string
  template: TemplateName
  template_data: Record<string, unknown>
  client_id?: string
  subject?: string
}): Promise<{ sent: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  try {
    const internalToken = await signInternalToken(60)
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Supabase gateway still requires anon key; real auth is the
        // internal token carried in x-internal-token.
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'x-internal-token': internalToken,
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
