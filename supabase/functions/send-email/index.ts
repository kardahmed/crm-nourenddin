import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { renderTemplate } from '../_shared/email-templates.ts'
import type { TemplateName } from '../_shared/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { type, to, subject, body, template, template_data, client_id, metadata } = await req.json()

    // Resolve email content: template or raw body
    let emailSubject = subject
    let emailHtml = ''

    if (template) {
      // Use template system
      const result = renderTemplate(template as TemplateName, {
        platform_name: undefined, // will be overridden below
        ...template_data,
      })
      emailSubject = emailSubject || result.subject
      emailHtml = result.html
    } else {
      // Legacy: raw body — validate required fields
      if (!to || !subject || !body) {
        return new Response(JSON.stringify({ error: 'Missing: to, subject, body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing: to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get from email + sender name from app_settings.
    // Default sender uses the immoprox.io domain (already verified in Resend).
    // Admin can override per deployment via Settings → Entreprise.
    const { data: settings } = await supabase.from('app_settings').select('custom_app_name, company_email').limit(1).single()
    const fromName = (settings as { custom_app_name: string | null } | null)?.custom_app_name ?? 'CRM Noureddine'
    const fromEmail = (settings as { company_email: string | null } | null)?.company_email ?? 'no-reply@immoprox.io'

    // If template was used, re-render with actual platform name
    if (template && !template_data?.platform_name) {
      const result = renderTemplate(template as TemplateName, {
        ...template_data,
        platform_name: fromName,
      })
      emailSubject = subject || result.subject
      emailHtml = result.html
    }

    // Legacy body wrapping (no template)
    if (!template && body) {
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0579DA; font-size: 20px; margin: 0;">${fromName}</h1>
          </div>
          <div style="background: #ffffff; border: 1px solid #E3E8EF; border-radius: 12px; padding: 24px;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <p style="text-align: center; color: #8898AA; font-size: 11px; margin-top: 20px;">
            ${fromName} — CRM Immobilier
          </p>
        </div>`
    }

    let sent = false
    let provider = 'none'

    // Try Resend if configured
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: emailSubject,
          html: emailHtml,
        }),
      })

      if (res.ok) {
        sent = true
        provider = 'resend'
      }
    }

    const emailStatus = metadata?.test ? 'test' : (sent ? 'sent' : 'failed')

    // Log to email_logs table
    await supabase.from('email_logs').insert({
      
      template: template ?? null,
      recipient: to,
      subject: emailSubject,
      status: emailStatus,
      provider,
      metadata: {
        ...(metadata ?? {}),
        type: type ?? null,
        client_id: client_id ?? null,
      },
    })

    // Also log in notifications (backward compat)
    await supabase.from('notifications').insert({
      
      type: 'email_sent',
      title: `Email: ${emailSubject}`,
      message: `Envoye a ${to} via ${provider}`,
    })

    // Log email in client history when a client is tied to the send
    if (client_id) {
      await supabase.from('history').insert({
        client_id,
        type: 'email',
        title: `Email envoye: ${emailSubject}`,
        description: `Destinataire: ${to}`,
      })
    }

    return new Response(JSON.stringify({ sent, provider, to, subject: emailSubject, status: emailStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
