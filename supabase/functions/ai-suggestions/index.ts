import { authenticate } from '../_shared/auth.ts'
import { rateLimit } from '../_shared/rateLimit.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Key priority: admin-managed DB row → env fallback. See call-script for rationale.
async function resolveAnthropicKey(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await supabase.from('app_secrets').select('anthropic_api_key').limit(1).maybeSingle()
    const dbKey = (data as { anthropic_api_key: string | null } | null)?.anthropic_api_key
    if (dbKey && dbKey.length > 0) return dbKey
  } catch { /* fall through */ }
  return Deno.env.get('ANTHROPIC_API_KEY') ?? null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_UNITS = 40
const MAX_STRING = 500

function sanitizeForPrompt(v: unknown, depth = 0): unknown {
  if (depth > 3) return null
  if (v == null) return null
  if (typeof v === 'string') return v.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, MAX_STRING)
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) return v.slice(0, 100).map(x => sanitizeForPrompt(x, depth + 1))
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (/^[A-Za-z0-9_]{1,40}$/.test(k)) out[k] = sanitizeForPrompt(val, depth + 1)
    }
    return out
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const auth = await authenticate(req, { corsHeaders })
  if (!auth.ok) return auth.response
  const { principal, supabase } = auth
  if (principal.kind !== 'user') {
    return new Response(JSON.stringify({ error: 'User required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 10 req/min per user, 100/hour as a safety net on Anthropic spend.
  const minuteLimit = rateLimit(`ai-suggestions:min:${principal.userId}`, 10, 60_000)
  if (!minuteLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded (minute)' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((minuteLimit.resetAt - Date.now()) / 1000)) },
    })
  }
  const hourLimit = rateLimit(`ai-suggestions:hour:${principal.userId}`, 100, 60 * 60_000)
  if (!hourLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded (hour)' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { clientProfile, unitsList } = body ?? {}

    if (!clientProfile || !unitsList || !Array.isArray(unitsList)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (unitsList.length > MAX_UNITS) {
      return new Response(JSON.stringify({ error: `unitsList exceeds ${MAX_UNITS}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const safeProfile = sanitizeForPrompt(clientProfile)
    const safeUnits = sanitizeForPrompt(unitsList)

    const anthropicKey = await resolveAnthropicKey(supabase)
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Call Anthropic API server-side
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'Tu es un expert immobilier algerien. Classe ces unites selon leur adequation avec le profil client. Criteres : budget, type souhaite, rapport qualite/prix, etage, surface. Reponds UNIQUEMENT avec un JSON array : [{"unit_id":"...","rank":1},...]',
        messages: [{
          role: 'user',
          content: `Profil client (JSON): ${JSON.stringify(safeProfile)}\n\nUnites disponibles (JSON): ${JSON.stringify(safeUnits)}`,
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // 4. Parse ranking from response.
    // Use a non-greedy first-array match so two arrays in the answer don't merge.
    const jsonMatch = text.match(/\[[\s\S]*?\]/)
    let ranking: unknown = null
    if (jsonMatch) {
      try { ranking = JSON.parse(jsonMatch[0]) } catch { /* fall through */ }
    }
    if (!Array.isArray(ranking)) {
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ranking }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Fatal error:', msg)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
