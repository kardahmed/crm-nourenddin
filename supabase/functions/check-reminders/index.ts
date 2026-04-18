import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailInternal } from '../_shared/send-email-internal.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailTask {
  agent_id: string | null
  template: 'payment_reminder' | 'reservation_expiring' | 'client_relaunch'
  template_data: Record<string, unknown>
  client_id?: string
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${supabaseServiceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0]
    const twoDaysFromNow = new Date(now.getTime() + 2 * 86400000).toISOString()
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString()

    const notifications: Array<{ user_id: string | null; type: string; title: string; message: string; metadata: Record<string, unknown> }> = []
    const emailTasks: EmailTask[] = []

    // 1. Payment reminders (due in 3 days)
    const { data: upcomingPayments } = await supabase
      .from('payment_schedules')
      .select('id, amount, due_date, installment_number, sales(agent_id, clients(full_name), units(code))')
      .eq('status', 'pending')
      .lte('due_date', threeDaysFromNow)
      .gte('due_date', now.toISOString().split('T')[0])

    for (const p of upcomingPayments ?? []) {
      const sale = p.sales as { agent_id: string; clients: { full_name: string } | null; units: { code: string } | null } | null
      const daysUntilDue = Math.ceil((new Date(p.due_date).getTime() - now.getTime()) / 86400000)
      notifications.push({
        user_id: sale?.agent_id ?? null,
        type: 'payment_reminder',
        title: `Echeance #${p.installment_number} dans ${daysUntilDue}j`,
        message: `${sale?.clients?.full_name ?? '-'} — ${sale?.units?.code ?? '-'} — ${p.amount} DA`,
        metadata: { payment_id: p.id, due_date: p.due_date },
      })
      emailTasks.push({
        agent_id: sale?.agent_id ?? null,
        template: 'payment_reminder',
        template_data: {
          client_name: sale?.clients?.full_name ?? '-',
          unit_code: sale?.units?.code ?? '-',
          installment_number: p.installment_number,
          amount: p.amount,
          due_date: p.due_date,
          days_until_due: daysUntilDue,
        },
      })
    }

    // 2. Expiring reservations (in 2 days)
    const { data: expiringRes } = await supabase
      .from('reservations')
      .select('id, agent_id, client_id, expires_at, clients(full_name), units(code)')
      .eq('status', 'active')
      .lte('expires_at', twoDaysFromNow)

    for (const r of expiringRes ?? []) {
      const client = (r as Record<string, unknown>).clients as { full_name: string } | null
      const unit = (r as Record<string, unknown>).units as { code: string } | null
      notifications.push({
        user_id: r.agent_id,
        type: 'reservation_expiring',
        title: `Reservation expire bientot`,
        message: `${client?.full_name ?? '-'} — ${unit?.code ?? '-'}`,
        metadata: { reservation_id: r.id, expires_at: r.expires_at },
      })
      emailTasks.push({
        agent_id: r.agent_id,
        template: 'reservation_expiring',
        template_data: {
          client_name: client?.full_name ?? '-',
          unit_code: unit?.code ?? '-',
          expires_at: r.expires_at,
        },
        client_id: r.client_id,
      })
    }

    // 3. Stale clients (no contact for 3+ days)
    const { data: staleClients } = await supabase
      .from('clients')
      .select('id, agent_id, full_name, last_contact_at, pipeline_stage')
      .lt('last_contact_at', threeDaysAgo)
      .not('pipeline_stage', 'in', '("vente","perdue")')

    for (const c of staleClients ?? []) {
      const days = Math.floor((now.getTime() - new Date(c.last_contact_at).getTime()) / 86400000)
      notifications.push({
        user_id: c.agent_id,
        type: 'client_relaunch',
        title: `Client a relancer (${days}j sans contact)`,
        message: c.full_name,
        metadata: { client_id: c.id, days_since_contact: days },
      })
      emailTasks.push({
        agent_id: c.agent_id,
        template: 'client_relaunch',
        template_data: {
          client_name: c.full_name,
          days_since_contact: days,
          pipeline_stage: c.pipeline_stage,
        },
        client_id: c.id,
      })
    }

    // Insert notifications
    let inserted = 0
    for (const n of notifications) {
      const { error } = await supabase.from('notifications').insert(n)
      if (!error) inserted++
    }

    // Read global notification preferences (single-tenant app_settings)
    const { data: prefs } = await supabase
      .from('app_settings')
      .select('notif_payment_late, notif_reservation_expired')
      .limit(1)
      .single()

    // Send emails to agents
    const agentIds = [...new Set(emailTasks.map(t => t.agent_id).filter(Boolean))] as string[]
    const { data: agentUsers } = agentIds.length > 0
      ? await supabase.from('users').select('id, email').in('id', agentIds)
      : { data: [] as Array<{ id: string; email: string }> }

    const agentEmailMap = new Map<string, string>()
    for (const u of agentUsers ?? []) {
      if (u.email) agentEmailMap.set(u.id, u.email)
    }

    let emailsSent = 0
    for (const task of emailTasks) {
      if (!task.agent_id) continue
      const email = agentEmailMap.get(task.agent_id)
      if (!email) continue
      if (task.template === 'payment_reminder' && prefs?.notif_payment_late === false) continue
      if (task.template === 'reservation_expiring' && prefs?.notif_reservation_expired === false) continue

      const result = await sendEmailInternal({
        to: email,
        template: task.template,
        template_data: task.template_data,
        client_id: task.client_id,
      })
      if (result.sent) emailsSent++
    }

    return new Response(JSON.stringify({
      message: `Created ${inserted} notification(s), sent ${emailsSent} email(s)`,
      breakdown: {
        payment_reminders: notifications.filter(n => n.type === 'payment_reminder').length,
        reservation_expiring: notifications.filter(n => n.type === 'reservation_expiring').length,
        client_relaunch: notifications.filter(n => n.type === 'client_relaunch').length,
      },
      emails_sent: emailsSent,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Fatal:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
