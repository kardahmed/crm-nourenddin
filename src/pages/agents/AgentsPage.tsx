import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, UserCheck, UserX, Plus, Eye, Pencil, Ban, Shield, MoreHorizontal, Archive,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError, parseEdgeError } from '@/lib/errors'
import { usePermissions } from '@/hooks/usePermissions'
import { useDebounce } from '@/hooks/useDebounce'
import {
  KPICard, SearchInput, StatusBadge, LoadingSpinner, Modal, UserAvatar,
} from '@/components/common'
import { TransferAgentModal } from './components/TransferAgentModal'
import { EditAgentModal } from './components/EditAgentModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { USER_ROLE_LABELS } from '@/types'
import type { UserRole } from '@/types'
import { PermissionProfilesSection } from '@/pages/settings/sections/PermissionProfilesSection'
import { formatDistanceToNow } from 'date-fns'
import { fr as frLocale, ar as arLocale, enUS as enLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'

type AgentStatus = 'active' | 'inactive' | 'archived'

interface AgentRow {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: UserRole
  status: AgentStatus
  last_activity: string | null
  archived_at: string | null
  avatar_url: string | null
  permission_profile_id: string | null
  clients_count: number
  sales_count: number
}

const STATUS_BADGE_TYPE: Record<AgentStatus, 'green' | 'red' | 'muted'> = {
  active: 'green',
  inactive: 'red',
  archived: 'muted',
}

export function AgentsPage() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'ar' ? arLocale : i18n.language === 'en' ? enLocale : frLocale
  const navigate = useNavigate()
  const { canManageAgents } = usePermissions()

  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'agents' | 'permissions'>('agents')
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [showCreate, setShowCreate] = useState(false)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  // Pinned once per mount so last-activity diffs stay stable across re-renders.
  // eslint-disable-next-line react-hooks/purity -- Date.now() inside an empty-deps useMemo is effectively a mount constant
  const nowMs = useMemo(() => Date.now(), [])

  // Fetch agents with counts. The agent_counts RPC aggregates in Postgres so
  // we don't ship every clients/sales row to the browser just to count them.
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => {
      const [usersRes, countsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, email, phone, role, status, last_activity, archived_at, avatar_url, permission_profile_id')
          .order('first_name'),
        supabase.rpc('agent_counts'),
      ])
      if (usersRes.error) { handleSupabaseError(usersRes.error); throw usersRes.error }
      if (countsRes.error) { handleSupabaseError(countsRes.error); throw countsRes.error }

      const counts = new Map<string, { clients_count: number; sales_count: number }>()
      for (const row of (countsRes.data ?? []) as Array<{ agent_id: string; clients_count: number; sales_count: number }>) {
        counts.set(row.agent_id, { clients_count: row.clients_count, sales_count: row.sales_count })
      }

      return (usersRes.data ?? []).map((u): AgentRow => {
        const c = counts.get(u.id)
        return {
          ...u,
          role: u.role as UserRole,
          status: (u.status ?? 'active') as AgentStatus,
          clients_count: c?.clients_count ?? 0,
          sales_count: c?.sales_count ?? 0,
        }
      })
    },
  })

  // Deactivate agent
  const deactivateAgent = useMemo(
    () => agents.find(a => a.id === deactivateId) ?? null,
    [agents, deactivateId],
  )
  const archiveAgentRow = useMemo(
    () => agents.find(a => a.id === archiveId) ?? null,
    [agents, archiveId],
  )
  const editAgentRow = useMemo(
    () => agents.find(a => a.id === editId) ?? null,
    [agents, editId],
  )

  // Archive mutation — hits the archive_agent RPC which validates
  // that the user is already inactive and owns nothing.
  const archive = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('archive_agent' as never, { p_agent_id: userId } as never)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents-list'] })
      toast.success(t('agents_page.toast_archived'))
      setArchiveId(null)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('agents_page.toast_archive_failed'))
    },
  })

  // KPIs (computed on the full, unfiltered list so archived users
  // don't distort the "inactif" count)
  const nonArchived = agents.filter(a => a.status !== 'archived')
  const total = nonArchived.length
  const active = agents.filter(a => a.status === 'active').length
  const inactive = agents.filter(a => a.status === 'inactive').length
  const archivedCount = agents.filter(a => a.status === 'archived').length
  const totalClients = agents.reduce((s, a) => s + a.clients_count, 0)

  // Filter: hide archived by default; `showArchived` flips to archived-only.
  const filtered = useMemo(() => {
    const base = showArchived
      ? agents.filter(a => a.status === 'archived')
      : agents.filter(a => a.status !== 'archived')
    if (!debouncedSearch) return base
    const q = debouncedSearch.toLowerCase()
    return base.filter(a =>
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    )
  }, [agents, debouncedSearch, showArchived])

  if (isLoading) return <LoadingSpinner size="lg" className="h-96" />

  return (
    <div className="space-y-5">
      {/* Tabs: Agents | Permissions */}
      {canManageAgents && (
        <div className="flex gap-1 border-b border-immo-border-default">
          <button onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${activeTab === 'agents' ? 'border-immo-accent-green text-immo-accent-green' : 'border-transparent text-immo-text-muted hover:text-immo-text-primary'}`}>
            <Users className="h-3.5 w-3.5" /> {t('nav.agents')}
          </button>
          <button onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${activeTab === 'permissions' ? 'border-immo-accent-green text-immo-accent-green' : 'border-transparent text-immo-text-muted hover:text-immo-text-primary'}`}>
            <Shield className="h-3.5 w-3.5" /> {t('agents_page.permission_profiles_tab')}
          </button>
        </div>
      )}

      {activeTab === 'permissions' ? (
        <PermissionProfilesSection />
      ) : (
      <>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label={t('agents_page.total_agents')} value={total} accent="blue" icon={<Users className="h-4 w-4 text-immo-accent-blue" />} />
        <KPICard label={t('agents_page.active_agents')} value={active} accent="green" icon={<UserCheck className="h-4 w-4 text-immo-accent-green" />} />
        <KPICard label={t('agents_page.inactive_agents')} value={inactive} accent="red" icon={<UserX className="h-4 w-4 text-immo-status-red" />} />
        <KPICard label={t('agents_page.assigned_clients')} value={totalClients} accent="blue" icon={<Users className="h-4 w-4 text-immo-accent-blue" />} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('agents_page.search_agent')} value={search} onChange={setSearch} className="w-full sm:w-[260px]" />
        <button
          onClick={() => setShowArchived(v => !v)}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            showArchived
              ? 'border-immo-accent-blue bg-immo-accent-blue/10 text-immo-accent-blue'
              : 'border-immo-border-default text-immo-text-muted hover:text-immo-text-primary'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived
            ? `${t('agents_page.hide_archived')}${archivedCount > 0 ? ` (${archivedCount})` : ''}`
            : `${t('agents_page.show_archived')}${archivedCount > 0 ? ` (${archivedCount})` : ''}`}
        </button>
        {canManageAgents && !showArchived && (
          <Button
            onClick={() => setShowCreate(true)}
            className="ml-auto bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('agents_page.add_agent')}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-immo-border-default">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-immo-bg-card-hover">
                {(showArchived
                  ? [t('field.agent'), t('agents_page.role'), t('field.email'), t('agents_page.clients_count'), t('agents_page.sales_count'), t('agents_page.archived_at'), t('field.status'), '']
                  : [t('field.agent'), t('agents_page.role'), t('field.phone'), t('field.email'), t('agents_page.clients_count'), t('agents_page.sales_count'), t('dashboard.last_activity'), t('field.status'), '']
                ).map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-immo-border-default">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showArchived ? 8 : 9} className="px-4 py-10 text-center text-sm text-immo-text-muted">
                    {search
                      ? t('agents_page.no_search_match')
                      : showArchived
                        ? t('agents_page.no_archived')
                        : t('agents_page.no_agents_hint')}
                  </td>
                </tr>
              )}
              {filtered.map(a => {
                const fullName = `${a.first_name} ${a.last_name}`
                const inactiveLong = a.last_activity && (nowMs - new Date(a.last_activity).getTime()) > 7 * 86400000
                const statusType = STATUS_BADGE_TYPE[a.status] ?? 'red'
                const statusLabel = t(`status.${a.status}`)
                const isArchivedRow = a.status === 'archived'

                return (
                  <tr key={a.id} className="bg-immo-bg-card transition-colors hover:bg-immo-bg-card-hover">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          firstName={a.first_name}
                          lastName={a.last_name}
                          avatarUrl={a.avatar_url}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-immo-text-primary">{fullName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-immo-text-secondary">{USER_ROLE_LABELS[a.role]}</td>
                    {!showArchived && (
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-immo-text-muted">{a.phone ?? '-'}</td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-immo-text-muted">{a.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-immo-text-primary">{a.clients_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-immo-accent-green">{a.sales_count}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {showArchived ? (
                        <span className="text-xs text-immo-text-muted">
                          {a.archived_at
                            ? formatDistanceToNow(new Date(a.archived_at), { addSuffix: true, locale: dateLocale })
                            : '-'}
                        </span>
                      ) : (
                        <span className={`text-xs ${inactiveLong ? 'font-medium text-immo-status-red' : 'text-immo-text-muted'}`}>
                          {a.last_activity ? formatDistanceToNow(new Date(a.last_activity), { addSuffix: true, locale: dateLocale }) : t('agents_page.never')}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge label={statusLabel} type={statusType} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-immo-text-muted hover:bg-immo-bg-card-hover hover:text-immo-text-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-immo-border-default bg-immo-bg-card">
                          <DropdownMenuItem onClick={() => navigate(`/agents/${a.id}`)} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">
                            <Eye className="mr-2 h-3.5 w-3.5" /> {t('agents_page.view_profile')}
                          </DropdownMenuItem>
                          {canManageAgents && !isArchivedRow && (
                            <DropdownMenuItem onClick={() => setEditId(a.id)} className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover">
                              <Pencil className="mr-2 h-3.5 w-3.5" /> {t('action.edit')}
                            </DropdownMenuItem>
                          )}
                          {a.status === 'active' && canManageAgents && (
                            <DropdownMenuItem onClick={() => setDeactivateId(a.id)} className="text-sm text-immo-status-red focus:bg-immo-status-red-bg">
                              <Ban className="mr-2 h-3.5 w-3.5" /> {t('agents_page.deactivate')}
                            </DropdownMenuItem>
                          )}
                          {a.status === 'inactive' && canManageAgents && (
                            <DropdownMenuItem onClick={() => setArchiveId(a.id)} className="text-sm text-immo-text-muted focus:bg-immo-bg-card-hover">
                              <Archive className="mr-2 h-3.5 w-3.5" /> {t('agents_page.archive_permanent')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <CreateAgentModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

      {/* Edit modal */}
      <EditAgentModal
        isOpen={!!editId}
        onClose={() => setEditId(null)}
        user={editAgentRow}
      />

      {/* Transfer + deactivate */}
      <TransferAgentModal
        isOpen={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        agentId={deactivateId}
        agentName={deactivateAgent ? `${deactivateAgent.first_name} ${deactivateAgent.last_name}` : ''}
      />

      {/* Archive confirmation */}
      <Modal
        isOpen={!!archiveId}
        onClose={() => (!archive.isPending ? setArchiveId(null) : undefined)}
        title={t('agents_page.archive_permanent')}
        subtitle={archiveAgentRow ? `${archiveAgentRow.first_name} ${archiveAgentRow.last_name}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-immo-border-default bg-immo-bg-card p-3 text-[12px] leading-relaxed text-immo-text-primary">
            <p className="mb-2 font-medium">{t('agents_page.archive_warning_title')}</p>
            <ul className="list-disc space-y-1 pl-5 text-immo-text-secondary">
              <li>{t('agents_page.archive_warning_1')}</li>
              <li>{t('agents_page.archive_warning_2')}</li>
              <li>{t('agents_page.archive_warning_3')}</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 border-t border-immo-border-default pt-4">
            <Button variant="ghost" onClick={() => setArchiveId(null)} disabled={archive.isPending}>
              {t('action.cancel')}
            </Button>
            <Button
              onClick={() => archiveId && archive.mutate(archiveId)}
              disabled={archive.isPending}
              className="bg-immo-text-muted font-semibold text-immo-bg-primary hover:bg-immo-text-muted/90"
            >
              {archive.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
              ) : (
                <>
                  <Archive className="mr-1.5 h-4 w-4" /> {t('agents_page.archive_button')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
      </>
      )}
    </div>
  )
}

/* ═══ Create Agent Modal ═══ */

function CreateAgentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'admin' | 'agent' | 'reception'>('agent')
  const [permissionProfileId, setPermissionProfileId] = useState<string>('')

  // Permission profiles dropdown — only meaningful for admin/agent; hidden
  // for reception which always uses the front-desk scope.
  const { data: profiles = [] } = useQuery({
    queryKey: ['permission-profiles-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('permission_profiles')
        .select('id, name')
        .order('name')
      return (data ?? []) as Array<{ id: string; name: string }>
    },
    enabled: isOpen,
  })

  const create = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role,
      }
      if (role !== 'reception' && permissionProfileId) {
        body.permission_profile_id = permissionProfileId
      }
      const { data, error } = await supabase.functions.invoke('create-user', { body })
      if (error) throw await parseEdgeError(error)
      const payload = data as { error?: string; user_id?: string; invitation_sent?: boolean }
      if (payload?.error) throw new Error(payload.error)
      if (!payload?.user_id) throw new Error(t('agents_page.invalid_server_response'))
      return payload as { user_id: string; invitation_sent: boolean }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['agents-list'] })
      const roleLabel = t(`role.${role}`)
      toast.success(
        data.invitation_sent
          ? t('agents_page.created_with_invitation', { role: roleLabel, email })
          : t('agents_page.created_no_invitation', { role: roleLabel }),
        { duration: 15000 },
      )
      resetAndClose()
    },
    onError: (err) => {
      toast.error((err as Error).message)
    },
  })

  function resetAndClose() {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('')
    setRole('agent'); setPermissionProfileId('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title={t('agents_page.add_user')} subtitle={t('agents_page.add_user_subtitle')} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium text-immo-text-muted">{t('agents_page.first_name_required')}</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Mohamed" className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-immo-text-muted">{t('agents_page.last_name_required')}</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ali" className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">{t('agents_page.email_required')}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@agence.com" className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">{t('field.phone')}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0555 123 456" className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">{t('agents_page.role_required')}</Label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'agent' | 'reception')} className={`mt-1 h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
            <option value="agent">{t('role.agent')}</option>
            <option value="reception">{t('role.reception')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>
          {role === 'reception' && (
            <p className="mt-1 text-[11px] text-immo-text-muted">
              {t('agents_page.reception_hint')}
            </p>
          )}
        </div>
        {role !== 'reception' && profiles.length > 0 && (
          <div>
            <Label className="text-[11px] font-medium text-immo-text-muted">{t('agents_page.permission_profile')}</Label>
            <select
              value={permissionProfileId}
              onChange={(e) => setPermissionProfileId(e.target.value)}
              className={`mt-1 h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}
            >
              <option value="">{t('agents_page.permission_default')}</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
          <Button variant="ghost" onClick={resetAndClose} className="text-immo-text-secondary hover:bg-immo-bg-card-hover">{t('action.cancel')}</Button>
          <Button onClick={() => create.mutate()} disabled={!firstName || !lastName || !email || create.isPending} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
            {create.isPending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" /> : t('agents_page.create_account')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
