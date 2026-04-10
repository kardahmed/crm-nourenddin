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
    // 1. Atomically mark overdue payments as late and return them
    // Use a single UPDATE with WHERE to avoid race conditions (fetch-then-update)
    const { data: updated, error: updateErr } = await supabase
      .from('payment_schedules')
      .update({ status: 'late' })
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .select('id, tenant_id, sale_id, amount, due_date, installment_number, sales(client_id, agent_id, clients(full_name, phone), units(code))')

    if (updateErr) {
      console.error('Update error:', updateErr)
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!updated || updated.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue payments', count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Marked ${updated.length} overdue payment(s) as late`)

    // 2. Check tenant notification preferences and send alerts
    const tenantIds = [...new Set(updated.map((p: { tenant_id: string }) => p.tenant_id))]

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('tenant_id, notif_payment_late')
      .in('tenant_id', tenantIds)

    const notifyTenants = new Set(
      (settings ?? [])
        .filter((s: { notif_payment_late: boolean }) => s.notif_payment_late !== false)
        .map((s: { tenant_id: string }) => s.tenant_id)
    )

    // Group overdue by tenant for notification
    const byTenant = new Map<string, Array<{
      client_name: string
      client_phone: string
      unit_code: string
      amount: number
      due_date: string
      installment: number
    }>>()

    for (const payment of updated) {
      const sale = payment.sales as {
        client_id: string
        agent_id: string
        clients: { full_name: string; phone: string } | null
        units: { code: string } | null
      } | null

      if (!notifyTenants.has(payment.tenant_id)) continue

      if (!byTenant.has(payment.tenant_id)) byTenant.set(payment.tenant_id, [])
      byTenant.get(payment.tenant_id)!.push({
        client_name: sale?.clients?.full_name ?? '-',
        client_phone: sale?.clients?.phone ?? '',
        unit_code: sale?.units?.code ?? '-',
        amount: payment.amount,
        due_date: payment.due_date,
        installment: payment.installment_number,
      })
    }

    // Log notifications (replace with email/webhook in production)
    const notifications: Array<{ tenant_id: string; count: number; details: string[] }> = []

    for (const [tenantId, payments] of byTenant) {
      const details = payments.map(
        (p) => `${p.client_name} — ${p.unit_code} — Echeance #${p.installment} — ${p.amount} DA — Du le ${p.due_date}`
      )

      notifications.push({
        tenant_id: tenantId,
        count: payments.length,
        details,
      })

      console.log(`[Tenant ${tenantId}] ${payments.length} paiement(s) en retard:`)
      details.forEach((d) => console.log(`  - ${d}`))
    }

    const result = {
      message: `Marked ${updated.length} payment(s) as late`,
      updated: updated.length,
      notifications_sent: notifications.length,
      notifications,
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Fatal error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
