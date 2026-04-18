import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import webpush from 'https://esm.sh/web-push@3.6.7'

/**
 * send-push — deliver Web Push notifications to one user's registered
 * devices. Intended to be called by other edge functions (or a DB hook)
 * with the service-role key.
 *
 * Body: {
 *   user_id: string,
 *   title: string,
 *   body?: string,
 *   url?: string,
 * }
 *
 * Env vars required:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — the key pair you also expose
 *     to the client via VITE_VAPID_PUBLIC_KEY. Generate once with:
 *       npx web-push generate-vapid-keys
 *   VAPID_SUBJECT — mailto:contact@yourdomain.tld (or https URL)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Subscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth = req.headers.get('Authorization') ?? ''
    if (auth !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:no-reply@immo-prox.local'
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user_id, title, body, url } = await req.json()
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing user_id or title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id)
    if (error) throw error

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const payload = JSON.stringify({ title, body: body ?? '', url: url ?? '/' })
    const results: Array<{ id: string; ok: boolean; reason?: string }> = []

    for (const sub of (subs ?? []) as Subscription[]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        results.push({ id: sub.id, ok: true })
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        results.push({ id: sub.id, ok: false, reason: e.message })
        // Gone / expired — clean up so we stop retrying.
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response(JSON.stringify({ delivered: results.filter(r => r.ok).length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-push error', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
