import { describe, it, expect } from 'vitest'
import { sanitizeTextHtml, blocksToHtml, type EmailBlock } from './blocksToHtml'

describe('sanitizeTextHtml', () => {
  it('strips <script> tags entirely', () => {
    const out = sanitizeTextHtml('<p>hi</p><script>alert(1)</script>')
    expect(out).not.toContain('script')
    expect(out).toContain('hi')
  })

  it('strips entity-encoded javascript: URLs (mXSS bypass class)', () => {
    const out = sanitizeTextHtml('<a href="java&#115;cript:alert(1)">x</a>')
    expect(out).not.toMatch(/javascript:/i)
  })

  it('strips on*-handlers from anchor tags', () => {
    const out = sanitizeTextHtml('<a href="#" onclick="alert(1)">x</a>')
    expect(out).not.toContain('onclick')
  })

  it('strips data: URI schemes', () => {
    const out = sanitizeTextHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(out).not.toContain('data:')
  })

  it('keeps allowed formatting tags', () => {
    const out = sanitizeTextHtml('<p><strong>bold</strong> <em>italic</em></p>')
    expect(out).toContain('<strong>')
    expect(out).toContain('<em>')
  })
})

describe('blocksToHtml', () => {
  it('renders a text block inside a table row', () => {
    const blocks: EmailBlock[] = [{
      id: 'b1',
      type: 'text',
      content: { text: '<p>Hello</p>' },
      styles: {},
    }]
    const html = blocksToHtml(blocks)
    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('rejects javascript: URLs in image src', () => {
    const blocks: EmailBlock[] = [{
      id: 'b1',
      type: 'image',
      content: { src: 'javascript:alert(1)', alt: 'x' },
      styles: {},
    }]
    const html = blocksToHtml(blocks)
    expect(html).not.toMatch(/javascript:/i)
  })
})
