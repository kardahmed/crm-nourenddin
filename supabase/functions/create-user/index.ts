// Admin-only edge function: creates a user in auth.users + public.users
// Sends an invitation email so the new user sets their own password — no
// temp password needs to be shared manually. Uses the service role key,
// bypasses signup rate limits, auto-confirms email. Caller must be admin.

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
    const siteUrl = Deno.env.get('SITE_URL') ?? Deno.env.get('PUBLIC_SITE_URL') ?? ''

    // 1. Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Session manquante — reconnectez-vous.' }, 401)

    const userClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: callerData, error: callerErr } = await userClient.auth.getUser(token)
    if (callerErr || !callerData?.user) {
      return json({ error: 'Session expirée — déconnectez-vous et reconnectez-vous.' }, 401)
    }

    const { data: callerRow } = await userClient
      .from('users')
      .select('role')
      .eq('id', callerData.user.id)
      .single()
    if (!callerRow || (callerRow as { role: string }).role !== 'admin') {
      return json({ error: 'Seul un administrateur peut créer des comptes.' }, 403)
    }

    // 2. Parse payload
    const { email, first_name, last_name, phone, role, permission_profile_id } =
      (await req.json()) as {
        email: string
        first_name: string
        last_name: string
        phone?: string | null
        role: 'admin' | 'agent' | 'reception'
        permission_profile_id?: string | null
      }

    if (!email || !first_name || !last_name || !role) {
      return json({ error: 'Missing required fields' }, 400)
    }

    if (!['admin', 'agent', 'reception'].includes(role)) {
      return json({ error: `Rôle invalide: ${role}` }, 400)
    }

    // Reception accounts never carry a permission_profile_id — their
    // scope is fixed by the RECEPTION_PERMISSIONS set in the client.
    const profileId = role === 'reception' ? null : (permission_profile_id ?? null)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3. Check for an orphan auth user (e.g. failed previous attempt) and
    //    reuse its id rather than 422-ing on duplicate email.
    let authUserId: string | null = null
    let invitationSent = false

    const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (existing) {
      const { data: existingProfile } = await admin
        .from('users')
        .select('id')
        .eq('id', existing.id)
        .maybeSingle()
      if (existingProfile) {
        return json({ error: 'Un utilisateur avec cet email existe déjà.' }, 409)
      }
      // Orphan: re-send a recovery email so the user can set a password
      authUserId = existing.id
      try {
        await admin.auth.admin.generateLink({ type: 'recovery', email })
        invitationSent = true
      } catch (linkErr) {
        console.warn('[create-user] Recovery link failed for orphan:', linkErr)
      }
    } else {
      // 4. Send an invitation email — Supabase creates the auth user with
      //    no password and emails them a link to set one.
      const redirectTo = siteUrl ? `${siteUrl}/auth/accept-invite` : undefined
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { first_name, last_name },
        redirectTo,
      })
      if (inviteErr || !invited?.user) {
        return json({ error: inviteErr?.message ?? "Échec de l'envoi de l'invitation" }, 400)
      }
      authUserId = invited.user.id
      invitationSent = true
    }

    // 5. Insert into public.users
    const { error: insertErr } = await admin.from('users').insert({
      id: authUserId,
      first_name,
      last_name,
      email,
      phone: phone ?? null,
      role,
      status: 'active',
      permission_profile_id: profileId,
    } as never)

    if (insertErr) {
      // Rollback auth.user if the profile insert failed and we just created it
      if (!existing) {
        await admin.auth.admin.deleteUser(authUserId).catch(() => {})
      }
      return json({ error: insertErr.message }, 400)
    }

    return json({
      success: true,
      user_id: authUserId,
      invitation_sent: invitationSent,
    })
  } catch (err) {
    console.error('[create-user]', err)
    return json({ error: (err as Error).message }, 500)
  }
})
