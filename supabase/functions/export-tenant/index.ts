import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Verify super_admin
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if ((profile as { role: string } | null)?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { tenant_id } = await req.json()
    if (!tenant_id) return new Response(JSON.stringify({ error: 'tenant_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Export all data for this tenant
    const tables = ['tenants', 'users', 'projects', 'units', 'clients', 'visits', 'reservations', 'sales', 'payment_schedules', 'history', 'documents', 'charges', 'tasks', 'agent_goals', 'tenant_settings', 'document_templates', 'landing_pages', 'call_scripts']

    const exportData: Record<string, unknown[]> = {}

    for (const table of tables) {
      const filter = table === 'tenants' ? { column: 'id', value: tenant_id } : { column: 'tenant_id', value: tenant_id }
      const { data } = await supabase.from(table).select('*').eq(filter.column, filter.value)
      exportData[table] = data ?? []
    }

    // Build JSON
    const jsonStr = JSON.stringify({ exported_at: new Date().toISOString(), tenant_id, data: exportData }, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })

    // Upload to storage
    const filename = `exports/${tenant_id}/backup-${Date.now()}.json`
    await supabase.storage.from('landing-assets').upload(filename, blob, { contentType: 'application/json' })
    const { data: urlData } = supabase.storage.from('landing-assets').getPublicUrl(filename)

    // Log
    await supabase.from('super_admin_logs').insert({
      super_admin_id: user.id, action: 'export_tenant', tenant_id, details: { tables: Object.keys(exportData).length, rows: Object.values(exportData).reduce((s, d) => s + d.length, 0) },
    } as never)

    return new Response(JSON.stringify({ url: urlData.publicUrl, tables: Object.keys(exportData).length, total_rows: Object.values(exportData).reduce((s, d) => s + d.length, 0) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
