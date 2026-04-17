// Shared authentication helpers for edge functions.
//
// authenticate(req, opts):
//   - Extracts the Authorization: Bearer <token> header.
//   - Accepts the service-role key as a trusted internal caller when
//     opts.allowService is true (used by cron / internal invocations).
//   - Otherwise treats the token as a user JWT, verifies it with
//     supabase.auth.getUser, and loads the user row from `users` to
//     get role, is_active, and id.
//   - If opts.requireAdmin, rejects non-admin / inactive users.
//
// Returns a 401/403 Response on failure, or the resolved principal.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type Principal =
  | { kind: 'service' }
  | { kind: 'user'; userId: string; role: string; isActive: boolean }

export interface AuthOptions {
  allowService?: boolean
  requireAdmin?: boolean
  corsHeaders?: Record<string, string>
}

const jsonHeaders = (cors?: Record<string, string>) => ({
  ...(cors ?? {}),
  'Content-Type': 'application/json',
})

export async function authenticate(
  req: Request,
  opts: AuthOptions = {},
): Promise<{ ok: true; principal: Principal; supabase: SupabaseClient } | { ok: false; response: Response }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: jsonHeaders(opts.corsHeaders),
      }),
    }
  }
  const token = match[1].trim()

  // Service-role token — internal caller. Never accept if not explicitly allowed.
  if (opts.allowService && token === serviceKey) {
    return { ok: true, principal: { kind: 'service' }, supabase }
  }

  // Reject anon key being passed as a user token.
  if (token === anonKey || token === serviceKey) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401,
        headers: jsonHeaders(opts.corsHeaders),
      }),
    }
  }

  // Verify user JWT.
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: jsonHeaders(opts.corsHeaders),
      }),
    }
  }

  // Load role + active flag.
  const { data: row } = await supabase
    .from('users')
    .select('id, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!row || (row as { is_active?: boolean }).is_active === false) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Inactive user' }), {
        status: 403,
        headers: jsonHeaders(opts.corsHeaders),
      }),
    }
  }

  const role = String((row as { role?: string }).role ?? 'agent')
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (opts.requireAdmin && !isAdmin) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403,
        headers: jsonHeaders(opts.corsHeaders),
      }),
    }
  }

  return {
    ok: true,
    principal: { kind: 'user', userId: userData.user.id, role, isActive: true },
    supabase,
  }
}
