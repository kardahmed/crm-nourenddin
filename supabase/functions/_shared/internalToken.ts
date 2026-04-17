// Short-lived HMAC token used for edge-function to edge-function calls.
// Avoids passing SUPABASE_SERVICE_ROLE_KEY over the network where it can
// end up in request logs. The signing secret is shared only between edge
// functions via the INTERNAL_FN_SECRET environment variable; if it is
// missing we fall back to a secret derived from the service role key so
// the system still works in dev without extra configuration.

const encoder = new TextEncoder()

function secret(): string {
  const explicit = Deno.env.get('INTERNAL_FN_SECRET')
  if (explicit && explicit.length >= 32) return explicit
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  // Derive a distinct value so the exact service key never leaves the process.
  return `internal:${svc}`
}

function base64url(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function hmac(key: string, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
}

export async function signInternalToken(ttlSeconds = 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(encoder.encode(JSON.stringify({ iat: now, exp: now + ttlSeconds, kind: 'internal' })))
  const sig = base64url(await hmac(secret(), payload))
  return `${payload}.${sig}`
}

export async function verifyInternalToken(token: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  const expected = base64url(await hmac(secret(), payload))
  // Constant-time compare on two base64url strings of equal length.
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  if (diff !== 0) return false
  try {
    const data = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)))
    const now = Math.floor(Date.now() / 1000)
    return data?.kind === 'internal' && typeof data.exp === 'number' && data.exp > now
  } catch {
    return false
  }
}
