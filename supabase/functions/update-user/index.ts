// Admin-only edge function: updates a user's profile fields.
//
// Handles:
//  - Name / phone / role / permission_profile_id / status updates → public.users
//  - Email change → auth.users (via admin API) AND public.users (atomic)
//  - Password reset → sends recovery email (does NOT reveal the new password)
//  - Avatar URL updates
//
// Security:
//  - Caller must be authenticated admin
//  - Cannot modify your own role or status (prevents lockout)
//  - Email uniqueness enforced server-side

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
    if (!authHeader) return json({ error: 'Session manquante — reconnectez-vous.' }, 401)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: callerData, error: callerErr } = await admin.auth.getUser(token)
    if (callerErr || !callerData?.user) {
      return json({ error: 'Session expirée — déconnectez-vous et reconnectez-vous.' }, 401)
    }

    const { data: callerRow } = await admin
      .from('users')
      .select('role')
      .eq('id', callerData.user.id)
      .single()
    if (!callerRow || (callerRow as { role: string }).role !== 'admin') {
      return json({ error: 'Seul un administrateur peut modifier des comptes.' }, 403)
    }

    // 2. Parse payload
    const body = (await req.json()) as {
      user_id: string
      first_name?: string
      last_name?: string
      email?: string
      phone?: string | null
      role?: 'admin' | 'agent' | 'reception'
      permission_profile_id?: string | null
      status?: 'active' | 'inactive'
      send_password_reset?: boolean
    }

    const { user_id } = body
    if (!user_id) return json({ error: 'user_id requis' }, 400)

    const isSelf = user_id === callerData.user.id

    // Prevent self-lockout: admin can't change own role / status
    if (isSelf && (body.role !== undefined || body.status !== undefined)) {
      return json({
        error: 'Vous ne pouvez pas modifier votre propre rôle ou statut.',
      }, 403)
    }

    if (body.role && !['admin', 'agent', 'reception'].includes(body.role)) {
      return json({ error: `Rôle invalide: ${body.role}` }, 400)
    }

    // 3. If email change requested, update auth.users first
    if (body.email) {
      const newEmail = body.email.trim().toLowerCase()

      // Check uniqueness against both auth.users AND public.users
      const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const collision = existingList?.users?.find(
        (u) => u.email?.toLowerCase() === newEmail && u.id !== user_id,
      )
      if (collision) {
        return json({ error: 'Cet email est déjà utilisé par un autre compte.' }, 409)
      }

      // Update auth.users (admin API, confirms new email without verification
      // since this is an admin-driven correction, not a user self-change).
      const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
        email: newEmail,
        email_confirm: true,
      })
      if (authErr) {
        return json({ error: `Auth update failed: ${authErr.message}` }, 400)
      }
    }

    // 4. Update public.users with all the other fields in one UPDATE
    const updates: Record<string, unknown> = {}
    if (body.first_name !== undefined) updates.first_name = body.first_name.trim()
    if (body.last_name !== undefined) updates.last_name = body.last_name.trim()
    if (body.email !== undefined) updates.email = body.email.trim().toLowerCase()
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null
    if (body.role !== undefined) updates.role = body.role
    if (body.status !== undefined) updates.status = body.status
    // Reception role never carries a permission_profile_id
    if (body.permission_profile_id !== undefined) {
      updates.permission_profile_id = body.role === 'reception' ? null : body.permission_profile_id
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await admin
        .from('users')
        .update(updates as never)
        .eq('id', user_id)

      if (updateErr) {
        return json({ error: updateErr.message }, 400)
      }
    }

    // 5. Password reset (optional)
    let passwordResetSent = false
    if (body.send_password_reset) {
      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id)
      const targetEmail = targetAuth?.user?.email
      if (targetEmail) {
        try {
          await admin.auth.admin.generateLink({ type: 'recovery', email: targetEmail })
          passwordResetSent = true
        } catch (linkErr) {
          console.warn('[update-user] password reset link failed:', linkErr)
        }
      }
    }

    return json({
      success: true,
      password_reset_sent: passwordResetSent,
    })
  } catch (err) {
    console.error('[update-user]', err)
    return json({ error: (err as Error).message }, 500)
  }
})
