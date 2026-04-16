// Admin-only edge function: creates a user in auth.users + public.users
// Uses the service role key, so it bypasses client signup rate limits and
// can auto-confirm emails. The caller must already be an authenticated admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const userClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: callerData, error: callerErr } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (callerErr || !callerData?.user) return json({ error: 'Invalid token' }, 401)

    const { data: callerRow } = await userClient
      .from('users')
      .select('role')
      .eq('id', callerData.user.id)
      .single()
    if (!callerRow || (callerRow as { role: string }).role !== 'admin') {
      return json({ error: 'Only admins can create users' }, 403)
    }

    // 2. Parse payload
    const { email, first_name, last_name, phone, role, permission_profile_id } =
      (await req.json()) as {
        email: string
        first_name: string
        last_name: string
        phone?: string | null
        role: 'admin' | 'agent'
        permission_profile_id?: string | null
      }

    if (!email || !first_name || !last_name || !role) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // 3. Generate a strong temporary password
    const tempPassword = `Immo${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}!Aa1`

    // 4. Create the auth user (auto-confirmed)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    })
    if (createErr || !created?.user) {
      return json({ error: createErr?.message ?? 'Auth user creation failed' }, 400)
    }

    // 5. Insert into public.users
    const { error: insertErr } = await admin.from('users').insert({
      id: created.user.id,
      first_name,
      last_name,
      email,
      phone: phone ?? null,
      role,
      status: 'active',
      permission_profile_id: permission_profile_id ?? null,
    } as never)

    if (insertErr) {
      // Rollback auth.user if the profile insert failed
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
      return json({ error: insertErr.message }, 400)
    }

    return json({ success: true, user_id: created.user.id, temp_password: tempPassword })
  } catch (err) {
    console.error('[create-user]', err)
    return json({ error: (err as Error).message }, 500)
  }
})
