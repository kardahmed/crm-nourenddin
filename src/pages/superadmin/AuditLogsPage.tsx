import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Search, Download, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { LoadingSpinner, StatusBadge } from '@/components/common'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface LogEntry {
  id: string
  super_admin_id: string
  action: string
  tenant_id: string | null
  details: Record<string, unknown>
  created_at: string
  admin_name?: string
  tenant_name?: string
}

const ACTION_LABELS: Record<string, { label: string; color: 'green' | 'blue' | 'orange' | 'red' | 'muted' }> = {
  create_tenant: { label: 'Creation tenant', color: 'green' },
  create_user: { label: 'Creation utilisateur', color: 'green' },
  update_role: { label: 'Changement role', color: 'blue' },
  toggle_status: { label: 'Changement statut', color: 'orange' },
  reset_password: { label: 'Reset mot de passe', color: 'blue' },
  delete_user: { label: 'Suppression utilisateur', color: 'red' },
  enter_tenant: { label: 'Acces tenant', color: 'muted' },
  update_settings: { label: 'Modification parametres', color: 'blue' },
}

const PAGE_SIZE = 50

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['super-admin-logs', actionFilter, limit],
    queryFn: async () => {
      let query = supabase
        .from('super_admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      const { data, error } = await query
      if (error) { handleSupabaseError(error); throw error }

      // Enrich with admin names and tenant names
      const entries = data as LogEntry[]
      if (entries.length === 0) return entries

      // Fetch admin names
      const adminIds = [...new Set(entries.map(e => e.super_admin_id))]
      const { data: admins } = await supabase.from('users').select('id, first_name, last_name').in('id', adminIds)
      const adminMap = new Map((admins ?? []).map(a => [a.id, `${a.first_name} ${a.last_name}`]))

      // Fetch tenant names
      const tenantIds = [...new Set(entries.filter(e => e.tenant_id).map(e => e.tenant_id!))]
      const { data: tenants } = tenantIds.length > 0
        ? await supabase.from('tenants').select('id, name').in('id', tenantIds)
        : { data: [] }
      const tenantMap = new Map((tenants ?? []).map(t => [t.id, t.name]))

      return entries.map(e => ({
        ...e,
        admin_name: adminMap.get(e.super_admin_id) ?? '-',
        tenant_name: e.tenant_id ? tenantMap.get(e.tenant_id) ?? '-' : '-',
      }))
    },
  })

  // Filter by search
  const filtered = logs.filter(l => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      l.action.toLowerCase().includes(s) ||
      l.admin_name?.toLowerCase().includes(s) ||
      l.tenant_name?.toLowerCase().includes(s) ||
      JSON.stringify(l.details).toLowerCase().includes(s)
    )
  })

  // Export CSV
  function exportCSV() {
    const headers = ['Date', 'Heure', 'Admin', 'Action', 'Tenant', 'Details']
    const rows = filtered.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy'),
      format(new Date(l.created_at), 'HH:mm:ss'),
      l.admin_name ?? '',
      ACTION_LABELS[l.action]?.label ?? l.action,
      l.tenant_name ?? '',
      JSON.stringify(l.details),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <LoadingSpinner size="lg" className="h-96" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
          <p className="text-sm text-[#7F96B7]">Historique de toutes les actions super admin</p>
        </div>
        <Button onClick={exportCSV} variant="ghost" className="border border-[#1E325A] text-sm text-[#7F96B7] hover:bg-[#1E325A] hover:text-white">
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4E6687]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les logs..."
            className="h-10 w-full rounded-lg border border-[#1E325A] bg-[#0F1830] pl-10 pr-4 text-sm text-white placeholder-[#4E6687] outline-none focus:border-[#7C3AED]"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-[#7F96B7]" />
          {['all', ...Object.keys(ACTION_LABELS)].map(key => (
            <button
              key={key}
              onClick={() => setActionFilter(key)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                actionFilter === key
                  ? 'bg-[#7C3AED]/15 font-medium text-[#7C3AED]'
                  : 'text-[#7F96B7] hover:bg-[#1E325A]'
              }`}
            >
              {key === 'all' ? 'Tous' : ACTION_LABELS[key]?.label ?? key}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#1E325A]">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0F1830]">
              {['Date', 'Admin', 'Action', 'Tenant', 'Details'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#7F96B7]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E325A]">
            {filtered.map(l => {
              const meta = ACTION_LABELS[l.action]
              return (
                <tr key={l.id} className="bg-[#0A1030] transition-colors hover:bg-[#0F1830]">
                  <td className="px-4 py-3">
                    <p className="text-sm text-white">{format(new Date(l.created_at), 'dd/MM/yyyy')}</p>
                    <p className="text-[11px] text-[#7F96B7]">{format(new Date(l.created_at), 'HH:mm:ss')}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{l.admin_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={meta?.label ?? l.action} type={meta?.color ?? 'muted'} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[#7F96B7]">{l.tenant_name}</td>
                  <td className="px-4 py-3">
                    <DetailsCell details={l.details} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16">
            <ScrollText className="h-10 w-10 text-[#1E325A]" />
            <p className="text-sm text-[#7F96B7]">Aucun log trouve</p>
          </div>
        )}
      </div>

      {/* Load more */}
      {logs.length >= limit && (
        <div className="text-center">
          <button
            onClick={() => setLimit(l => l + PAGE_SIZE)}
            className="rounded-lg border border-[#1E325A] px-4 py-2 text-xs text-[#7F96B7] hover:bg-[#1E325A] hover:text-white"
          >
            Charger plus...
          </button>
        </div>
      )}
    </div>
  )
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  if (!details || Object.keys(details).length === 0) return <span className="text-[#4E6687]">-</span>

  const entries = Object.entries(details).slice(0, 3)
  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <p key={key} className="text-[11px] text-[#7F96B7]">
          <span className="text-[#4E6687]">{key}:</span> {String(value)}
        </p>
      ))}
    </div>
  )
}
