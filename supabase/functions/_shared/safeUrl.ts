// URL-safety helpers shared across edge functions.

const PRIVATE_HOSTS = new Set([
  'localhost', 'localhost.', '0.0.0.0', '127.0.0.1', '::1', '::',
  'metadata.google.internal', 'metadata.internal', 'metadata',
])

function isIPv4(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
}

function ipv4InPrivateRange(host: string): boolean {
  const parts = host.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224) return true
  return false
}

/**
 * Accept only http(s) URLs that resolve (by hostname literal) to a
 * routable public host. Rejects loopback, link-local, RFC1918,
 * cloud-metadata endpoints, and anything non-URL-parseable.
 */
export function isSafeOutboundUrl(
  raw: string,
  opts: { allowHosts?: string[]; schemes?: string[] } = {},
): boolean {
  if (!raw || typeof raw !== 'string') return false
  let u: URL
  try { u = new URL(raw) } catch { return false }
  const schemes = opts.schemes ?? ['https:']
  if (!schemes.includes(u.protocol)) return false
  const host = u.hostname.toLowerCase()
  if (!host) return false
  if (PRIVATE_HOSTS.has(host)) return false
  if (isIPv4(host) && ipv4InPrivateRange(host)) return false
  if (host.endsWith('.local')) return false
  if (host.endsWith('.internal')) return false
  // IPv6 literals: any bracketed host we refuse except global unicast (leave off for safety).
  if (host.startsWith('[')) return false
  if (opts.allowHosts && opts.allowHosts.length > 0) {
    return opts.allowHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`))
  }
  return true
}
