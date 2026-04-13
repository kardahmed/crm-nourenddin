import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Auth: service role key required
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
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] // Last day of month

    // 1. Get all tenants with their plan
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, plan, suspended_at')

    if (!tenants || tenants.length === 0) {
      return new Response(JSON.stringify({ message: 'No tenants', count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Get plan pricing
    const { data: plans } = await supabase.from('plan_limits').select('plan, price_monthly')
    const planPricing = new Map((plans ?? []).map((p: { plan: string; price_monthly: number }) => [p.plan, p.price_monthly]))

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const tenant of tenants) {
      try {
        const t = tenant as unknown as { id: string; name: string; plan: string; suspended_at: string | null }
        const plan = t.plan ?? 'free'

        // Skip free plan and suspended tenants
        if (plan === 'free' || t.suspended_at) {
          skipped++
          continue
        }

        const amount = planPricing.get(plan) ?? 0
        if (amount <= 0) {
          skipped++
          continue
        }

        // Check if invoice already exists for this period
        const { data: existing } = await supabase
          .from('invoices')
          .select('id')
          .eq('tenant_id', t.id)
          .eq('period', period)
          .limit(1)

        if (existing && existing.length > 0) {
          skipped++
          continue
        }

        // Create invoice
        const { error: insertErr } = await supabase.from('invoices').insert({
          tenant_id: t.id,
          amount,
          period,
          due_date: dueDate,
          status: 'pending',
        })

        if (insertErr) {
          errors.push(`Tenant ${t.id}: ${insertErr.message}`)
          continue
        }

        created++
      } catch (err) {
        errors.push(`Tenant ${tenant.id}: ${(err as Error).message}`)
      }
    }

    // 3. Reset usage counters for the new month
    await supabase
      .from('tenant_settings')
      .update({ api_calls_count: 0, last_reset_at: now.toISOString() } as never)
      .gte('api_calls_count', 0)

    const result = {
      message: `Generated ${created} invoice(s) for ${period}`,
      period,
      created,
      skipped,
      total_tenants: tenants.length,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log(result.message)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Fatal:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
