import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  Calendar, CheckCircle2, ClipboardList, Coins, IdCard, Phone, AlertCircle,
  MessageCircle, ChevronRight, Circle,
} from 'lucide-react'
import { format, isBefore, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { LoadingSpinner } from '@/components/common'
import { formatPriceCompact } from '@/lib/constants'
import toast from 'react-hot-toast'

type VisitRow = {
  id: string
  scheduled_at: string
  status: string
  visit_type: string
  clients: { id: string; full_name: string; phone: string | null } | null
  projects: { id: string; name: string } | null
}

type TaskRow = {
  id: string
  title: string
  scheduled_at: string | null
  template_id: string | null
  status: string
  clients: { id: string; full_name: string; phone: string | null } | null
}

type ClientRow = {
  id: string
  full_name: string
  phone: string | null
  pipeline_stage: string
  confirmed_budget: number | null
  nin_cin: string | null
  cin_verified: boolean | null
  last_contact_at: string | null
}

function whatsappHref(phone: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^0/, '213')
  return `https://wa.me/${cleaned}`
}

export function TodayPage() {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.session?.user?.id)
  const qc = useQueryClient()
  // Pinned once per mount so day-diff calculations stay stable across re-renders.
  // eslint-disable-next-line react-hooks/purity -- Date.now() inside an empty-deps useMemo is effectively a mount constant
  const nowMs = useMemo(() => Date.now(), [])

  const { data, isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ['today', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Missing user')
      const dayStart = startOfDay(new Date()).toISOString()
      const dayEnd = endOfDay(new Date()).toISOString()

      const [visitsRes, tasksRes, clientsRes] = await Promise.all([
        supabase
          .from('visits')
          .select('id, scheduled_at, status, visit_type, clients(id, full_name, phone), projects(id, name)')
          .eq('agent_id', userId)
          .gte('scheduled_at', dayStart)
          .lte('scheduled_at', dayEnd)
          .order('scheduled_at'),
        supabase
          .from('client_tasks')
          .select('id, title, scheduled_at, template_id, status, clients(id, full_name, phone)')
          .eq('agent_id', userId)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true, nullsFirst: false }),
        supabase
          .from('clients')
          .select('id, full_name, phone, pipeline_stage, confirmed_budget, nin_cin, cin_verified, last_contact_at')
          .eq('agent_id', userId)
          .not('pipeline_stage', 'in', '(vente,perdue)')
          .limit(500),
      ])

      const visits = (visitsRes.data ?? []) as VisitRow[]
      const tasks = (tasksRes.data ?? []) as TaskRow[]
      const clients = (clientsRes.data ?? []) as ClientRow[]

      const now = new Date()
      const overdueTasks = tasks.filter(t => t.scheduled_at && isBefore(new Date(t.scheduled_at), now))
      const todayTasks = tasks.filter(t => {
        if (!t.scheduled_at) return false
        const d = new Date(t.scheduled_at)
        return d >= startOfDay(now) && d <= endOfDay(now) && !isBefore(d, now)
      })
      const undatedTasks = tasks.filter(t => !t.scheduled_at).slice(0, 5)

      const budgetTbd = clients.filter(c => !c.confirmed_budget).slice(0, 10)
      const cinMissing = clients.filter(c => !c.nin_cin || !c.cin_verified).slice(0, 10)

      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000)
      const toFollowUp = clients
        .filter(c => !c.last_contact_at || new Date(c.last_contact_at) < threeDaysAgo)
        .sort((a, b) => {
          const at = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0
          const bt = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0
          return at - bt
        })
        .slice(0, 8)

      return {
        visits,
        overdueTasks,
        todayTasks,
        undatedTasks,
        budgetTbd,
        cinMissing,
        toFollowUp,
      }
    },
  })

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('client_tasks').update({ status: 'completed', completed_at: new Date().toISOString() } as never).eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today'] })
      qc.invalidateQueries({ queryKey: ['client-tasks'] })
      toast.success(t('tasks_page.kpi_completed'))
    },
  })

  const counts = useMemo(() => {
    if (!data) return null
    return {
      visits: data.visits.length,
      tasks: data.overdueTasks.length + data.todayTasks.length,
      budget: data.budgetTbd.length,
      cin: data.cinMissing.length,
      follow: data.toFollowUp.length,
    }
  }, [data])

  if (isLoading || !data || !counts) return <LoadingSpinner size="lg" className="h-96" />

  const totalItems = counts.visits + counts.tasks + counts.budget + counts.cin + counts.follow

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-immo-border-default bg-gradient-to-br from-immo-accent-green/5 to-immo-bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-immo-text-primary">À faire aujourd’hui</h2>
            <p className="mt-1 text-sm text-immo-text-muted">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-immo-accent-green">{totalItems}</div>
            <div className="text-[10px] uppercase tracking-wider text-immo-text-muted">actions</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <StatChip icon={Calendar} label="Visites" value={counts.visits} tone="orange" />
          <StatChip icon={ClipboardList} label="Tâches" value={counts.tasks} tone="blue" />
          <StatChip icon={Coins} label="Budget" value={counts.budget} tone="green" />
          <StatChip icon={IdCard} label="CIN manquant" value={counts.cin} tone="red" />
          <StatChip icon={Phone} label="Relances" value={counts.follow} tone="orange" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Visites du jour" icon={Calendar} count={counts.visits}>
          {data.visits.length === 0 ? (
            <Empty text="Aucune visite prévue aujourd’hui." />
          ) : (
            data.visits.map(v => {
              const dt = new Date(v.scheduled_at)
              const waHref = whatsappHref(v.clients?.phone ?? null)
              return (
                <Row key={v.id}>
                  <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-immo-accent-green/10 font-mono text-xs font-bold text-immo-accent-green">
                    {format(dt, 'HH:mm')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={v.clients ? `/pipeline/clients/${v.clients.id}` : '#'}
                      className="truncate text-sm font-medium text-immo-text-primary hover:text-immo-accent-green"
                    >
                      {v.clients?.full_name ?? '—'}
                    </Link>
                    <div className="truncate text-[11px] text-immo-text-muted">
                      {v.visit_type} {v.projects ? `· ${v.projects.name}` : ''} · {v.status}
                    </div>
                  </div>
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1.5 text-immo-accent-green hover:bg-immo-accent-green/10"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </Row>
              )
            })
          )}
        </Section>

        <Section title="Tâches" icon={ClipboardList} count={counts.tasks}>
          {data.overdueTasks.length === 0 && data.todayTasks.length === 0 && data.undatedTasks.length === 0 ? (
            <Empty text="Rien à faire. Prends un café." />
          ) : (
            <>
              {data.overdueTasks.length > 0 && (
                <div className="border-l-2 border-immo-status-red bg-immo-status-red/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-immo-status-red">
                  En retard
                </div>
              )}
              {data.overdueTasks.map(t => (
                <TaskLine key={t.id} task={t} onDone={(id) => completeTask.mutate(id)} overdue />
              ))}
              {data.todayTasks.length > 0 && (
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-immo-text-muted">
                  Aujourd’hui
                </div>
              )}
              {data.todayTasks.map(t => (
                <TaskLine key={t.id} task={t} onDone={(id) => completeTask.mutate(id)} />
              ))}
              {data.undatedTasks.length > 0 && (
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-immo-text-muted">
                  Sans échéance
                </div>
              )}
              {data.undatedTasks.map(t => (
                <TaskLine key={t.id} task={t} onDone={(id) => completeTask.mutate(id)} />
              ))}
            </>
          )}
        </Section>

        <Section title="Budget à confirmer" icon={Coins} count={counts.budget}>
          {data.budgetTbd.length === 0 ? (
            <Empty text="Tous les budgets sont validés." />
          ) : (
            data.budgetTbd.map(c => (
              <ClientRowLink key={c.id} client={c} trailing={
                <span className="text-[11px] text-immo-text-muted">{c.pipeline_stage}</span>
              } />
            ))
          )}
        </Section>

        <Section title="CIN manquante / non vérifiée" icon={IdCard} count={counts.cin}>
          {data.cinMissing.length === 0 ? (
            <Empty text="Toutes les CIN sont en règle." />
          ) : (
            data.cinMissing.map(c => (
              <ClientRowLink key={c.id} client={c} trailing={
                !c.nin_cin
                  ? <span className="rounded bg-immo-status-red/10 px-1.5 py-0.5 text-[10px] font-medium text-immo-status-red">Aucun</span>
                  : <span className="rounded bg-immo-status-orange/10 px-1.5 py-0.5 text-[10px] font-medium text-immo-status-orange">À vérifier</span>
              } />
            ))
          )}
        </Section>

        <Section title="Clients à relancer" icon={Phone} count={counts.follow}>
          {data.toFollowUp.length === 0 ? (
            <Empty text="Tous tes clients sont suivis." />
          ) : (
            data.toFollowUp.map(c => {
              const days = c.last_contact_at
                ? Math.floor((nowMs - new Date(c.last_contact_at).getTime()) / 86400000)
                : null
              return (
                <ClientRowLink key={c.id} client={c} trailing={
                  <span className="text-[11px] text-immo-text-muted">
                    {days === null ? 'Jamais' : `${days}j`}
                  </span>
                } />
              )
            })
          )}
        </Section>
      </div>
    </div>
  )
}

function StatChip({ icon: Icon, label, value, tone }: {
  icon: typeof Calendar
  label: string
  value: number
  tone: 'orange' | 'blue' | 'green' | 'red'
}) {
  const toneClasses = {
    orange: 'text-immo-status-orange bg-immo-status-orange/10',
    blue: 'text-immo-accent-blue bg-immo-accent-blue/10',
    green: 'text-immo-accent-green bg-immo-accent-green/10',
    red: 'text-immo-status-red bg-immo-status-red/10',
  }[tone]
  return (
    <div className="flex items-center gap-2 rounded-lg border border-immo-border-default bg-immo-bg-card px-3 py-2">
      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${toneClasses}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-immo-text-primary">{value}</div>
        <div className="truncate text-[10px] uppercase tracking-wider text-immo-text-muted">{label}</div>
      </div>
    </div>
  )
}

function Section({
  title, icon: Icon, count, children,
}: { title: string; icon: typeof Calendar; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-immo-border-default bg-immo-bg-card">
      <div className="flex items-center justify-between border-b border-immo-border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-immo-text-muted" />
          <h3 className="text-sm font-semibold text-immo-text-primary">{title}</h3>
        </div>
        <span className="rounded-full bg-immo-bg-primary px-2 py-0.5 text-[11px] font-semibold text-immo-text-muted">
          {count}
        </span>
      </div>
      <div className="max-h-[360px] divide-y divide-immo-border-default overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-4 py-2.5">{children}</div>
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-immo-text-muted">
      <CheckCircle2 className="h-4 w-4 text-immo-accent-green" />
      {text}
    </div>
  )
}

function TaskLine({ task, onDone, overdue }: {
  task: TaskRow
  onDone: (id: string) => void
  overdue?: boolean
}) {
  const waHref = whatsappHref(task.clients?.phone ?? null)
  return (
    <Row>
      <button
        onClick={() => onDone(task.id)}
        className="shrink-0 text-immo-text-muted hover:text-immo-accent-green"
        title="Terminer"
      >
        <Circle className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {overdue && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-immo-status-red" />}
          <span className="truncate text-sm text-immo-text-primary">{task.title}</span>
        </div>
        <div className="truncate text-[11px] text-immo-text-muted">
          {task.clients ? (
            <Link to={`/pipeline/clients/${task.clients.id}`} className="hover:text-immo-text-primary">
              {task.clients.full_name}
            </Link>
          ) : '—'}
          {task.scheduled_at && <> · {format(new Date(task.scheduled_at), 'HH:mm')}</>}
          {task.template_id && <> · IA</>}
        </div>
      </div>
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-md p-1.5 text-immo-accent-green hover:bg-immo-accent-green/10"
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
    </Row>
  )
}

function ClientRowLink({ client, trailing }: {
  client: ClientRow
  trailing?: React.ReactNode
}) {
  const waHref = whatsappHref(client.phone)
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <Link
          to={`/pipeline/clients/${client.id}`}
          className="flex items-center gap-1 truncate text-sm text-immo-text-primary hover:text-immo-accent-green"
        >
          {client.full_name}
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
        </Link>
        <div className="truncate text-[11px] text-immo-text-muted">
          {client.phone ?? 'Sans téléphone'}
          {client.confirmed_budget && <> · {formatPriceCompact(client.confirmed_budget)}</>}
        </div>
      </div>
      {trailing}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-md p-1.5 text-immo-accent-green hover:bg-immo-accent-green/10"
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
    </Row>
  )
}
