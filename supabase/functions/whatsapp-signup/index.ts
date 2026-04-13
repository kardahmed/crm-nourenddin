import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Verify user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Invalid token' }, 401)

    // Get tenant
    const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', user.id).single()
    if (!profile?.tenant_id) return json({ error: 'No tenant' }, 403)
    if (profile.role === 'agent') return json({ error: 'Admin only' }, 403)

    // Get platform WhatsApp config (for app_id and app_secret)
    const { data: waConfig } = await supabase.from('whatsapp_config').select('*').eq('is_active', true).limit(1).single()
    if (!waConfig) return json({ error: 'WhatsApp non configure sur la plateforme' }, 503)

    const config = waConfig as unknown as {
      meta_app_id: string
      meta_app_secret: string
      access_token: string
    }

    const { code } = await req.json() as { code: string }
    if (!code) return json({ error: 'code required' }, 400)

    // 1. Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${config.meta_app_id}&client_secret=${config.meta_app_secret}&code=${code}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return json({ error: 'Echec d\'echange du code Meta. Reessayez.' }, 502)
    }

    const userToken = tokenData.access_token

    // 2. Get the shared WABA IDs using debug_token or the business endpoint
    // First, get the user's WABA
    const wabaRes = await fetch(`https://graph.facebook.com/v25.0/debug_token?input_token=${userToken}&access_token=${config.meta_app_id}|${config.meta_app_secret}`)
    const wabaData = await wabaRes.json()

    // 3. List phone numbers from the WABA that was just connected
    // Try to get WABA from the granular scopes
    let wabaId: string | null = null
    let phoneNumberId: string | null = null
    let displayPhone: string | null = null

    // Get WABA IDs the user shared
    const sharedWabaRes = await fetch(`https://graph.facebook.com/v25.0/me/whatsapp_business_accounts`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    })
    const sharedWabaData = await sharedWabaRes.json()

    if (sharedWabaData.data && sharedWabaData.data.length > 0) {
      wabaId = sharedWabaData.data[0].id

      // Get phone numbers for this WABA
      const phonesRes = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/phone_numbers`, {
        headers: { 'Authorization': `Bearer ${config.access_token}` },
      })
      const phonesData = await phonesRes.json()

      if (phonesData.data && phonesData.data.length > 0) {
        phoneNumberId = phonesData.data[0].id
        displayPhone = phonesData.data[0].display_phone_number
      }
    }

    if (!wabaId || !phoneNumberId) {
      return json({ error: 'Impossible de recuperer le numero WhatsApp. Verifiez que vous avez bien connecte un numero.' }, 400)
    }

    // 4. Subscribe the app to the WABA (required for sending)
    await fetch(`https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.access_token}` },
    })

    // 5. Store in whatsapp_accounts
    const { data: existing } = await supabase
      .from('whatsapp_accounts')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .single()

    const accountData = {
      tenant_id: profile.tenant_id,
      is_active: true,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      display_phone: displayPhone,
      access_token: userToken,
      plan: 'starter',
      monthly_quota: 500,
      messages_sent: 0,
    }

    if (existing) {
      await supabase.from('whatsapp_accounts')
        .update({
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          display_phone: displayPhone,
          access_token: userToken,
          is_active: true,
        } as never)
        .eq('tenant_id', profile.tenant_id)
    } else {
      await supabase.from('whatsapp_accounts').insert(accountData as never)
    }

    console.log(`WhatsApp signup: tenant ${profile.tenant_id} connected ${displayPhone} (WABA: ${wabaId}, Phone: ${phoneNumberId})`)

    return json({
      success: true,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      display_phone: displayPhone,
    })
  } catch (err) {
    console.error('Fatal:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
