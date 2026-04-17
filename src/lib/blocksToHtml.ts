// ─── Convert email template blocks (JSON) to responsive HTML email ──────────
// Produces Outlook-safe, table-based HTML with inline styles.

export interface EmailBlock {
  id: string
  type: 'text' | 'image' | 'button' | 'columns' | 'divider' | 'spacer'
  content: Record<string, unknown>
  styles: Record<string, string>
}

const DEFAULT_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Minimal whitelist HTML sanitiser for text block content. Allows only safe
// formatting tags and strips on*-handlers + javascript:/data: URLs.
const ALLOWED_TEXT_TAGS = new Set([
  'p','br','h1','h2','h3','h4','h5','h6','strong','em','b','i','u','a',
  'span','div','ul','ol','li','hr','blockquote',
])

function stripDangerousAttrs(tag: string): string {
  let t = tag.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  t = t.replace(/\s+(href|src)\s*=\s*"(\s*(?:javascript|data|vbscript):[^"]*)"/gi, ' $1="#"')
  t = t.replace(/\s+(href|src)\s*=\s*'(\s*(?:javascript|data|vbscript):[^']*)'/gi, " $1='#'")
  return t
}

export function sanitizeTextHtml(input: string): string {
  let html = String(input ?? '')
  html = html.replace(/<(script|style|iframe|object|embed|svg|math|link|meta|form|input|textarea|button)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  html = html.replace(/<(script|style|iframe|object|embed|svg|math|link|meta|form|input|textarea|button)\b[^>]*\/?>/gi, '')
  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName: string) => {
    return ALLOWED_TEXT_TAGS.has(tagName.toLowerCase()) ? stripDangerousAttrs(match) : ''
  })
  return html
}

// CSS value validators: block expression(), url(), javascript:, @import, and
// any character that could break out of an attribute context.
const CSS_FORBID = /(?:expression\s*\(|url\s*\(|behavior\s*:|javascript\s*:|vbscript\s*:|data\s*:|@import|<|>|;|\{|\})/i

function cssSafeRaw(v: string | undefined): string | null {
  if (!v) return null
  const s = String(v).trim()
  if (!s || CSS_FORBID.test(s) || s.includes('"')) return null
  return s
}

function cssSize(v: string | undefined, fallback: string): string {
  const s = cssSafeRaw(v)
  if (!s) return fallback
  if (/^(-?\d+(\.\d+)?(px|em|rem|%|pt|vh|vw)?\s*){1,4}$/i.test(s)) return s
  return fallback
}

function cssColor(v: string | undefined, fallback: string): string {
  const s = cssSafeRaw(v)
  if (!s) return fallback
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s
  if (/^rgba?\(\s*[\d.\s,%]+\s*\)$/i.test(s)) return s
  if (/^[a-z]+$/i.test(s)) return s
  return fallback
}

function cssAlign(v: string | undefined, fallback: string): string {
  const s = String(v ?? '').toLowerCase()
  return ['left', 'right', 'center', 'justify'].includes(s) ? s : fallback
}

function safeUrl(v: string | undefined, fallback = '#'): string {
  if (!v) return fallback
  const s = String(v).trim()
  if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(s)) return fallback
  return s.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E')
}

function blockToHtml(block: EmailBlock, trackingBaseUrl?: string): string {
  const s = block.styles || {}

  switch (block.type) {
    case 'text': {
      const text = sanitizeTextHtml(String(block.content.text ?? ''))
      const fontSize = cssSize(s.fontSize, '14px')
      const color = cssColor(s.color, '#1A2B3D')
      const align = cssAlign(s.textAlign, 'left')
      const padding = cssSize(s.padding, '8px 0')
      return `<tr><td style="padding:${padding};font-size:${fontSize};color:${color};text-align:${align};line-height:1.6;font-family:${DEFAULT_FONT}">${text}</td></tr>`
    }

    case 'image': {
      const src = safeUrl(String(block.content.src ?? ''), '')
      const alt = escapeHtml(String(block.content.alt ?? ''))
      const width = cssSize(s.width, '100%')
      const align = cssAlign(s.textAlign, 'center')
      const borderRadius = cssSize(s.borderRadius, '8px')
      if (!src) return ''
      return `<tr><td style="padding:8px 0;text-align:${align}"><img src="${src}" alt="${alt}" width="${width}" style="max-width:100%;height:auto;border-radius:${borderRadius};display:block;margin:0 auto" /></td></tr>`
    }

    case 'button': {
      const text = escapeHtml(String(block.content.text ?? 'Cliquer ici'))
      let url = safeUrl(String(block.content.url ?? '#'))
      const bgColor = cssColor(s.backgroundColor, '#0579DA')
      const textColor = cssColor(s.color, '#ffffff')
      const borderRadius = cssSize(s.borderRadius, '8px')
      const align = cssAlign(s.textAlign, 'center')
      if (trackingBaseUrl && url !== '#') {
        url = `${trackingBaseUrl}&url=${encodeURIComponent(url)}`
      }
      return `<tr><td style="padding:16px 0;text-align:${align}"><a href="${url}" style="display:inline-block;background:${bgColor};color:${textColor}!important;text-decoration:none;padding:12px 28px;border-radius:${borderRadius};font-weight:600;font-size:14px;font-family:${DEFAULT_FONT}">${text}</a></td></tr>`
    }

    case 'columns': {
      const children = (block.content.children ?? []) as EmailBlock[]
      const gap = cssSize(s.gap, '16px')
      const cols = children.length || 2
      const widthPct = Math.floor(100 / cols)
      const gapPx = parseInt(gap, 10) || 16
      const cells = children.map(child =>
        `<td style="width:${widthPct}%;vertical-align:top;padding:0 ${gapPx / 2}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blockToHtml(child, trackingBaseUrl)}</table></td>`
      ).join('')
      return `<tr><td style="padding:8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr>`
    }

    case 'divider': {
      const color = cssColor(s.borderColor, '#E3E8EF')
      const margin = cssSize(s.margin, '16px 0')
      return `<tr><td style="padding:${margin}"><hr style="border:none;border-top:1px solid ${color};margin:0" /></td></tr>`
    }

    case 'spacer': {
      const height = cssSize(s.height, '24px')
      return `<tr><td style="height:${height};line-height:${height};font-size:1px">&nbsp;</td></tr>`
    }

    default:
      return ''
  }
}

export interface BlocksToHtmlOptions {
  platformName?: string
  trackingPixelUrl?: string  // URL for open tracking pixel
  trackingBaseUrl?: string   // Base URL for click tracking
}

export function blocksToHtml(blocks: EmailBlock[], options: BlocksToHtmlOptions = {}): string {
  const platformName = options.platformName ?? 'IMMO PRO-X'
  const blocksHtml = blocks.map(b => blockToHtml(b, options.trackingBaseUrl)).join('\n')
  const trackingPixel = options.trackingPixelUrl
    ? `<img src="${options.trackingPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" alt="" />`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${platformName}</title>
  <style>
    body{margin:0;padding:0;-webkit-text-size-adjust:100%;background-color:#F6F9FC}
    table{border-spacing:0;border-collapse:collapse}
    td{padding:0}
    img{border:0;line-height:100%;outline:none;text-decoration:none}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important}
      .content-cell{padding:16px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F6F9FC;font-family:${DEFAULT_FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F9FC">
    <tr>
      <td align="center" style="padding:20px 10px">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="text-align:center;padding:32px 20px 16px">
              <div style="display:inline-block;background:#0579DA;color:#ffffff;width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:700;text-align:center">IP</div>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#0579DA">${platformName}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:0 0 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-cell" style="padding:24px;background:#ffffff;border:1px solid #E3E8EF;border-radius:12px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${blocksHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding:20px;color:#8898AA;font-size:11px;line-height:1.5">
              <p style="margin:0 0 4px">${platformName} — CRM Immobilier</p>
              <p style="margin:0;color:#B0BEC5;font-size:10px">Cet email a été envoyé automatiquement.</p>
              ${trackingPixel}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Default starter blocks for new templates ───────────────────────────────

export const STARTER_BLOCKS: EmailBlock[] = [
  {
    id: 'b1',
    type: 'text',
    content: { text: '<h2 style="margin:0;color:#1A2B3D">Titre de votre email</h2>' },
    styles: { padding: '0 0 8px' },
  },
  {
    id: 'b2',
    type: 'text',
    content: { text: '<p style="margin:0;color:#5E6C84">Bonjour {client_name},</p><p style="margin:8px 0 0;color:#5E6C84">Voici le contenu de votre email marketing. Personnalisez ce texte avec votre message.</p>' },
    styles: {},
  },
  {
    id: 'b3',
    type: 'button',
    content: { text: 'En savoir plus', url: '#' },
    styles: { backgroundColor: '#0579DA', color: '#ffffff', borderRadius: '8px', textAlign: 'center' },
  },
]
