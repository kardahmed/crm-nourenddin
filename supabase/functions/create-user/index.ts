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
    console.log('[create-user] Authorization header present:', !!authHeader)
    if (!authHeader) return json({ error: 'Session manquante — reconnectez-vous.' }, 401)

    const userClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: callerData, error: callerErr } = await userClient.auth.getUser(token)
    if (callerErr || !callerData?.user) {
      console.warn('[create-user] Token invalid:', callerErr?.message)
      return json({ error: 'Session expirée — déconnectez-vous et reconnectez-vous.' }, 401)
    }

    const { data: callerRow } = await userClient
      .from('users')
      .select('role')
      .eq('id', callerData.user.id)
      .single()
    if (!callerRow || (callerRow as { role: string }).role !== 'admin') {
      console.warn('[create-user] Caller is not admin:', callerData.user.id)
      return json({ error: 'Seul un administrateur peut créer des comptes.' }, 403)
    }
    console.log('[create-user] Caller admin verified:', callerData.user.email)

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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 4. Check if an auth user with this email already exists (orphan from
    //    failed previous attempts) and reuse / clean it up to avoid errors.
    let authUserId: string | null = null
    {
      const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) {
        // Is there already a public.users row for this id? If yes, refuse.
        const { data: existingProfile } = await admin
          .from('users')
          .select('id')
          .eq('id', existing.id)
          .maybeSingle()
        if (existingProfile) {
          return json({ error: 'Un utilisateur avec cet email existe déjà.' }, 409)
        }
        // Orphan auth user (no profile): reset its password, reuse the id.
        const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
          email_confirm: true,
          user_metadata: { first_name, last_name },
        })
        if (updErr) return json({ error: `Réinitialisation échouée: ${updErr.message}` }, 400)
        authUserId = existing.id
      }
    }

    // 5. Create the auth user if no orphan found
    if (!authUserId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name, last_name },
      })
      if (createErr || !created?.user) {
        return json({ error: createErr?.message ?? 'Auth user creation failed' }, 400)
      }
      authUserId = created.user.id
    }

    // 6. Insert into public.users
    const { error: insertErr } = await admin.from('users').insert({
      id: authUserId,
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
      await admin.auth.admin.deleteUser(authUserId).catch(() => {})
      return json({ error: insertErr.message }, 400)
    }

    return json({ success: true, user_id: authUserId, temp_password: tempPassword })
  } catch (err) {
    console.error('[create-user]', err)
    return json({ error: (err as Error).message }, 500)
  }
})
