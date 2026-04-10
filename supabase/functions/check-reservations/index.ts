import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Verify authorization: must provide service role key as Bearer token
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${supabaseServiceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 1. Find expired reservations
    const { data: expired, error: fetchErr } = await supabase
      .from('reservations')
      .select('id, tenant_id, client_id, unit_id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    if (fetchErr) {
      console.error('Fetch error:', fetchErr)
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired reservations', count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${expired.length} expired reservation(s)`)

    let processed = 0
    const errors: string[] = []

    for (const reservation of expired) {
      try {
        // a. Expire the reservation
        const { error: expireErr } = await supabase
          .from('reservations')
          .update({ status: 'expired' })
          .eq('id', reservation.id)

        if (expireErr) throw new Error(`Expire reservation ${reservation.id}: ${expireErr.message}`)

        // b. Free the unit
        const { error: unitErr } = await supabase
          .from('units')
          .update({ status: 'available', client_id: null })
          .eq('id', reservation.unit_id)

        if (unitErr) throw new Error(`Free unit ${reservation.unit_id}: ${unitErr.message}`)

        // c. Log history
        const { error: histErr } = await supabase
          .from('history')
          .insert({
            tenant_id: reservation.tenant_id,
            client_id: reservation.client_id,
            agent_id: null,
            type: 'stage_change',
            title: 'Réservation expirée — client passé en relancement',
            description: `Réservation ${reservation.id} expirée automatiquement`,
            metadata: {
              reservation_id: reservation.id,
              unit_id: reservation.unit_id,
              from: 'reservation',
              to: 'relancement',
              auto: true,
            },
          })

        if (histErr) throw new Error(`History ${reservation.id}: ${histErr.message}`)

        // d. Move client to relancement
        const { error: clientErr } = await supabase
          .from('clients')
          .update({ pipeline_stage: 'relancement' })
          .eq('id', reservation.client_id)
          .eq('pipeline_stage', 'reservation') // Only if still in reservation stage

        if (clientErr) throw new Error(`Client ${reservation.client_id}: ${clientErr.message}`)

        processed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(msg)
        errors.push(msg)
      }
    }

    const result = {
      message: `Processed ${processed}/${expired.length} expired reservations`,
      processed,
      total: expired.length,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log(result.message)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Fatal error:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
