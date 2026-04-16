// Cron: mark overdue payments as late and notify admins.
// Runs daily via pg_cron or scheduled edge function trigger.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailInternal } from '../_shared/send-email-internal.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
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
    // 1. Mark overdue payments as late
    const { data: updated, error: updateErr } = await supabase
      .from('payment_schedules')
      .update({ status: 'late' })
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .select('id, sale_id, amount, due_date, installment_number, sales(client_id, agent_id, clients(full_name, phone), units(code))')

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

    // 2. Check global notification preference
    const { data: settings } = await supabase
      .from('app_settings')
      .select('notif_payment_late')
      .limit(1)
      .single()

    if (settings?.notif_payment_late === false) {
      return new Response(JSON.stringify({
        message: `Marked ${updated.length} payment(s) as late (notifications disabled)`,
        updated: updated.length,
        emails_sent: 0,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // 3. Notify all active admins by email
    const { data: admins } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .eq('status', 'active')

    let emailsSent = 0
    for (const admin of admins ?? []) {
      if (!admin.email) continue
      for (const payment of updated) {
        const sale = payment.sales as {
          client_id: string
          agent_id: string
          clients: { full_name: string; phone: string } | null
          units: { code: string } | null
        } | null
        const result = await sendEmailInternal({
          to: admin.email,
          template: 'payment_overdue',
          template_data: {
            client_name: sale?.clients?.full_name ?? '-',
            client_phone: sale?.clients?.phone ?? '',
            unit_code: sale?.units?.code ?? '-',
            installment_number: payment.installment_number,
            amount: payment.amount,
            due_date: payment.due_date,
          },
          client_id: sale?.client_id,
        })
        if (result.sent) emailsSent++
      }
    }

    // 4. Create in-app notifications for admins
    const adminIds = (admins ?? []).map((a) => a.id)
    if (adminIds.length > 0) {
      await supabase.from('notifications').insert(
        adminIds.map((id) => ({
          user_id: id,
          type: 'payment_late',
          title: `${updated.length} paiement(s) en retard`,
          message: 'Consultez la section Dossiers pour relancer les clients.',
          metadata: { count: updated.length },
        })),
      )
    }

    return new Response(JSON.stringify({
      message: `Marked ${updated.length} payment(s) as late`,
      updated: updated.length,
      admins_notified: adminIds.length,
      emails_sent: emailsSent,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Fatal error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
