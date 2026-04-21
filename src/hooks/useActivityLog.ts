import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ActivitySource = 'audit' | 'history' | 'email' | 'message'

export interface ActivityEntry {
  id: string
  source: ActivitySource
  created_at: string
  actor_id: string | null
  actor_name: string | null
  action: string
  table_name: string | null
  record_id: string | null
  title: string
  description: string | null
  client_id: string | null
  client_name: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

export interface ActivityFilters {
  agentId?: string
  source?: ActivitySource | 'all'
  from?: string
  to?: string
  search?: string
}

type UserLite = { id: string; first_name: string | null; last_name: string | null }
type ClientLite = { id: string; full_name: string | null }

function fullName(u: UserLite | null | undefined): string | null {
  if (!u) return null
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || null
}

export function useActivityLog(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: ['activity-log', filters],
    queryFn: async (): Promise<ActivityEntry[]> => {
      const from = filters.from ?? null
      const to = filters.to ?? null

      // Parallel fetch across the four sources. Each source is clipped to
      // 500 rows server-side so the union stays bounded for admin browsing.
      const [auditRes, historyRes, emailRes, messageRes, usersRes, clientsRes] = await Promise.all([
        (async () => {
          let q = supabase.from('audit_trail' as never).select('*').order('created_at', { ascending: false }).limit(500)
          if (from) q = q.gte('created_at', from)
          if (to) q = q.lte('created_at', to)
          if (filters.agentId) q = q.eq('user_id', filters.agentId)
          return q
        })(),
        (async () => {
          let q = supabase.from('history').select('*').order('created_at', { ascending: false }).limit(500)
          if (from) q = q.gte('created_at', from)
          if (to) q = q.lte('created_at', to)
          if (filters.agentId) q = q.eq('agent_id', filters.agentId)
          return q
        })(),
        (async () => {
          let q = supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(500)
          if (from) q = q.gte('created_at', from)
          if (to) q = q.lte('created_at', to)
          return q
        })(),
        (async () => {
          let q = supabase.from('sent_messages_log' as never).select('*').order('sent_at', { ascending: false }).limit(500)
          if (from) q = q.gte('sent_at', from)
          if (to) q = q.lte('sent_at', to)
          if (filters.agentId) q = q.eq('agent_id', filters.agentId)
          return q
        })(),
        supabase.from('users').select('id, first_name, last_name'),
        supabase.from('clients').select('id, full_name'),
      ])

      const userMap = new Map<string, UserLite>()
      for (const u of ((usersRes.data ?? []) as UserLite[])) userMap.set(u.id, u)

      const clientMap = new Map<string, ClientLite>()
      for (const c of ((clientsRes.data ?? []) as ClientLite[])) clientMap.set(c.id, c)

      const entries: ActivityEntry[] = []

      // audit_trail rows
      type AuditRow = {
        id: string
        user_id: string | null
        action: string
        table_name: string
        record_id: string
        old_data: Record<string, unknown> | null
        new_data: Record<string, unknown> | null
        created_at: string
      }
      for (const r of ((auditRes.data ?? []) as AuditRow[])) {
        entries.push({
          id: `audit:${r.id}`,
          source: 'audit',
          created_at: r.created_at,
          actor_id: r.user_id,
          actor_name: fullName(r.user_id ? userMap.get(r.user_id) : null),
          action: r.action,
          table_name: r.table_name,
          record_id: r.record_id,
          title: `${r.action.toUpperCase()} ${r.table_name}`,
          description: null,
          client_id: r.table_name === 'clients' ? r.record_id : null,
          client_name: r.table_name === 'clients' ? (clientMap.get(r.record_id)?.full_name ?? null) : null,
          old_data: r.old_data,
          new_data: r.new_data,
          metadata: null,
        })
      }

      // history rows
      type HistoryRow = {
        id: string
        client_id: string
        agent_id: string | null
        type: string
        title: string
        description: string | null
        metadata: Record<string, unknown>
        created_at: string
      }
      for (const r of ((historyRes.data ?? []) as HistoryRow[])) {
        entries.push({
          id: `history:${r.id}`,
          source: 'history',
          created_at: r.created_at,
          actor_id: r.agent_id,
          actor_name: fullName(r.agent_id ? userMap.get(r.agent_id) : null),
          action: r.type,
          table_name: 'clients',
          record_id: r.client_id,
          title: r.title,
          description: r.description,
          client_id: r.client_id,
          client_name: clientMap.get(r.client_id)?.full_name ?? null,
          old_data: null,
          new_data: null,
          metadata: r.metadata,
        })
      }

      // email_logs rows
      type EmailRow = {
        id: string
        recipient: string | null
        subject: string | null
        template: string | null
        status: string | null
        provider: string | null
        created_at: string
      }
      for (const r of ((emailRes.data ?? []) as EmailRow[])) {
        entries.push({
          id: `email:${r.id}`,
          source: 'email',
          created_at: r.created_at,
          actor_id: null,
          actor_name: 'System',
          action: r.status ?? 'sent',
          table_name: 'email_logs',
          record_id: r.id,
          title: r.subject ?? (r.template ?? 'Email'),
          description: r.recipient,
          client_id: null,
          client_name: null,
          old_data: null,
          new_data: null,
          metadata: { template: r.template, status: r.status, provider: r.provider },
        })
      }

      // sent_messages_log rows (WhatsApp / SMS)
      type MessageRow = {
        id: string
        agent_id: string | null
        client_id: string | null
        channel: string | null
        message: string | null
        sent_at: string
      }
      for (const r of ((messageRes.data ?? []) as MessageRow[])) {
        entries.push({
          id: `message:${r.id}`,
          source: 'message',
          created_at: r.sent_at,
          actor_id: r.agent_id,
          actor_name: fullName(r.agent_id ? userMap.get(r.agent_id) : null),
          action: r.channel ?? 'message',
          table_name: 'sent_messages_log',
          record_id: r.id,
          title: `${(r.channel ?? 'MSG').toUpperCase()}`,
          description: r.message,
          client_id: r.client_id,
          client_name: r.client_id ? (clientMap.get(r.client_id)?.full_name ?? null) : null,
          old_data: null,
          new_data: null,
          metadata: { channel: r.channel },
        })
      }

      // Source filter applied in-memory (filters run after union)
      let filtered = entries
      if (filters.source && filters.source !== 'all') {
        filtered = filtered.filter((e) => e.source === filters.source)
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        filtered = filtered.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.description?.toLowerCase().includes(q) ?? false) ||
            (e.actor_name?.toLowerCase().includes(q) ?? false) ||
            (e.client_name?.toLowerCase().includes(q) ?? false) ||
            (e.table_name?.toLowerCase().includes(q) ?? false),
        )
      }

      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return filtered
    },
    staleTime: 30_000,
  })
}
