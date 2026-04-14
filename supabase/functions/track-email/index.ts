import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 1x1 transparent GIF
const TRACKING_PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0))

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const type = url.searchParams.get('t')        // 'open' or 'click'
  const recipientId = url.searchParams.get('rid')
  const campaignId = url.searchParams.get('cid')
  const redirectUrl = url.searchParams.get('url')

  if (!type || !recipientId) {
    return new Response('Missing params', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const now = new Date().toISOString()

    if (type === 'open') {
      // Record open event
      await supabase.from('email_events').insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: 'open',
      })

      // Update recipient status (only first open)
      await supabase.from('email_campaign_recipients')
        .update({ status: 'opened', opened_at: now })
        .eq('id', recipientId)
        .is('opened_at', null)

      // Increment campaign counter
      if (campaignId) {
        const { data: camp } = await supabase.from('email_campaigns').select('total_opened').eq('id', campaignId).single()
        if (camp) {
          await supabase.from('email_campaigns')
            .update({ total_opened: (camp.total_opened ?? 0) + 1 })
            .eq('id', campaignId)
        }
      }

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
    }

    if (type === 'click') {
      // Record click event
      await supabase.from('email_events').insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: 'click',
        metadata: { url: redirectUrl },
      })

      // Update recipient status
      await supabase.from('email_campaign_recipients')
        .update({ status: 'clicked', clicked_at: now })
        .eq('id', recipientId)
        .is('clicked_at', null)

      // Also mark as opened if not already
      await supabase.from('email_campaign_recipients')
        .update({ opened_at: now })
        .eq('id', recipientId)
        .is('opened_at', null)

      // Increment campaign click counter
      if (campaignId) {
        const { data: camp } = await supabase.from('email_campaigns').select('total_clicked').eq('id', campaignId).single()
        if (camp) {
          await supabase.from('email_campaigns')
            .update({ total_clicked: (camp.total_clicked ?? 0) + 1 })
            .eq('id', campaignId)
        }
      }

      // Redirect to the actual URL
      const destination = redirectUrl || '/'
      return new Response(null, {
        status: 302,
        headers: { 'Location': destination },
      })
    }

    return new Response('Unknown event type', { status: 400 })
  } catch (err) {
    console.error('track-email error:', err)
    // For open tracking, still return the pixel even if logging fails
    if (type === 'open') {
      return new Response(TRACKING_PIXEL, { headers: { 'Content-Type': 'image/gif' } })
    }
    // For click, redirect even if logging fails
    return new Response(null, { status: 302, headers: { 'Location': redirectUrl || '/' } })
  }
})
