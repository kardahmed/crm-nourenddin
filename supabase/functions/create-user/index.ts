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

    // 7. Send invitation email (best-effort — don't fail user creation if mail fails)
    let emailSent = false
    try {
      const { data: settings } = await admin.from('app_settings').select('custom_app_name, company_email').limit(1).single()
      const appName = (settings as { custom_app_name?: string } | null)?.custom_app_name ?? 'CRM Noureddine'
      const fromEmail = (settings as { company_email?: string } | null)?.company_email ?? 'no-reply@immoprox.io'
      const appUrl = req.headers.get('origin') ?? Deno.env.get('APP_URL') ?? ''

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0579DA;font-size:22px;margin:0 0 8px">Bienvenue sur ${appName}</h1>
          <p style="color:#425466;font-size:14px;line-height:1.6">Bonjour ${first_name},</p>
          <p style="color:#425466;font-size:14px;line-height:1.6">Un compte ${role === 'admin' ? 'administrateur' : 'agent'} vient d'être créé pour vous sur <strong>${appName}</strong>.</p>
          <div style="background:#F6F9FC;border:1px solid #E3E8EF;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;color:#8898AA;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Vos identifiants</p>
            <p style="margin:4px 0;color:#0A2540;font-size:14px"><strong>Email :</strong> ${email}</p>
            <p style="margin:4px 0;color:#0A2540;font-size:14px"><strong>Mot de passe temporaire :</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;border:1px solid #E3E8EF">${tempPassword}</code></p>
          </div>
          <p style="color:#425466;font-size:14px;line-height:1.6">Connectez-vous et changez votre mot de passe dès la première connexion.</p>
          ${appUrl ? `<p style="text-align:center;margin:32px 0"><a href="${appUrl}/login" style="display:inline-block;background:#0579DA;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Se connecter</a></p>` : ''}
          <p style="color:#8898AA;font-size:12px;text-align:center;margin-top:32px">${appName} — CRM Immobilier</p>
        </div>
      `

      // Send via Resend directly (Supabase SMTP is for auth flows; we use Resend API for transactional)
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: `${appName} <${fromEmail}>`,
            to: [email],
            subject: `Bienvenue sur ${appName} — vos identifiants`,
            html,
          }),
        })
        emailSent = resendRes.ok
        if (!resendRes.ok) {
          console.warn('[create-user] Resend send failed:', await resendRes.text())
        }
      }
    } catch (mailErr) {
      console.warn('[create-user] Invitation email error:', mailErr)
    }

    return json({ success: true, user_id: authUserId, temp_password: tempPassword, email_sent: emailSent })
  } catch (err) {
    console.error('[create-user]', err)
    return json({ error: (err as Error).message }, 500)
  }
})
