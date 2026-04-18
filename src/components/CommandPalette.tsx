import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, ArrowRight, User, Building2, Target, Users, ClipboardList,
  Calendar, BarChart3, Settings, Briefcase, Megaphone, PhoneCall,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type ItemKind = 'client' | 'project' | 'agent' | 'nav'

interface PaletteItem {
  id: string
  kind: ItemKind
  label: string
  sublabel?: string
  url: string
  icon: typeof User
}

const NAV_ITEMS_BASE: PaletteItem[] = [
  { id: 'nav-dashboard', kind: 'nav', label: 'Tableau de bord', sublabel: 'Vue d’ensemble', url: '/dashboard', icon: BarChart3 },
  { id: 'nav-pipeline', kind: 'nav', label: 'Pipeline', sublabel: 'Clients & stades', url: '/pipeline', icon: Users },
  { id: 'nav-projects', kind: 'nav', label: 'Projets', sublabel: 'Promotions & unités', url: '/projects', icon: Building2 },
  { id: 'nav-tasks', kind: 'nav', label: 'Tâches', sublabel: 'Actions du jour', url: '/tasks', icon: ClipboardList },
  { id: 'nav-planning', kind: 'nav', label: 'Planning', sublabel: 'Visites & RDV', url: '/planning', icon: Calendar },
  { id: 'nav-dossiers', kind: 'nav', label: 'Dossiers', sublabel: 'Documents clients', url: '/dossiers', icon: Briefcase },
  { id: 'nav-reception', kind: 'nav', label: 'Réception', sublabel: 'Accueil comptoir', url: '/reception', icon: PhoneCall },
]

const NAV_ITEMS_ADMIN: PaletteItem[] = [
  { id: 'nav-agents', kind: 'nav', label: 'Agents', sublabel: 'Annuaire équipe', url: '/agents', icon: Users },
  { id: 'nav-goals', kind: 'nav', label: 'Objectifs', sublabel: 'KPIs mensuels', url: '/goals', icon: Target },
  { id: 'nav-performance', kind: 'nav', label: 'Performance', sublabel: 'Classements agents', url: '/performance', icon: BarChart3 },
  { id: 'nav-reports', kind: 'nav', label: 'Rapports', url: '/reports', icon: BarChart3 },
  { id: 'nav-marketing', kind: 'nav', label: 'Marketing ROI', url: '/marketing-roi', icon: Megaphone },
  { id: 'nav-settings', kind: 'nav', label: 'Paramètres', url: '/settings', icon: Settings },
]

const KIND_LABEL: Record<ItemKind, string> = {
  client: 'Client',
  project: 'Projet',
  agent: 'Agent',
  nav: 'Navigation',
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const role = useAuthStore(s => s.role)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === 'k' || e.key === 'K'
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  const trimmed = query.trim()

  const remoteQuery = useQuery({
    queryKey: ['command-palette', trimmed],
    enabled: open && trimmed.length >= 2,
    queryFn: async (): Promise<PaletteItem[]> => {
      const escaped = trimmed.replace(/[%_(),.\\]/g, (ch) => `\\${ch}`)
      const clientsReq = supabase
        .from('clients')
        .select('id, full_name, phone, pipeline_stage')
        .or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`)
        .limit(6)

      const projectsReq = supabase
        .from('projects')
        .select('id, name, code')
        .or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`)
        .limit(4)

      const agentsReq = role === 'admin'
        ? supabase
            .from('users')
            .select('id, first_name, last_name, role')
            .in('role', ['agent', 'admin', 'reception'])
            .or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`)
            .limit(4)
        : Promise.resolve({ data: [] as Array<{ id: string; first_name: string; last_name: string; role: string }>, error: null })

      const [clientsRes, projectsRes, agentsRes] = await Promise.all([clientsReq, projectsReq, agentsReq])

      const items: PaletteItem[] = []
      for (const c of (clientsRes.data ?? [])) {
        items.push({
          id: `client-${c.id}`,
          kind: 'client',
          label: (c as { full_name: string }).full_name,
          sublabel: [(c as { phone?: string }).phone, (c as { pipeline_stage?: string }).pipeline_stage].filter(Boolean).join(' · '),
          url: `/pipeline/clients/${c.id}`,
          icon: User,
        })
      }
      for (const p of (projectsRes.data ?? [])) {
        items.push({
          id: `project-${p.id}`,
          kind: 'project',
          label: (p as { name: string }).name,
          sublabel: (p as { code?: string }).code ?? undefined,
          url: `/projects/${p.id}`,
          icon: Building2,
        })
      }
      for (const a of (agentsRes.data ?? [])) {
        items.push({
          id: `agent-${a.id}`,
          kind: 'agent',
          label: `${a.first_name} ${a.last_name}`,
          sublabel: a.role,
          url: `/agents/${a.id}`,
          icon: Users,
        })
      }
      return items
    },
    staleTime: 30_000,
  })

  const navItems = useMemo<PaletteItem[]>(() => {
    const base = role === 'reception' ? NAV_ITEMS_BASE.filter(n => n.url === '/reception') : NAV_ITEMS_BASE
    return role === 'admin' ? [...base, ...NAV_ITEMS_ADMIN] : base
  }, [role])

  const filteredNav = useMemo(() => {
    if (!trimmed) return navItems
    const q = trimmed.toLowerCase()
    return navItems.filter(n =>
      n.label.toLowerCase().includes(q) || (n.sublabel ?? '').toLowerCase().includes(q),
    )
  }, [navItems, trimmed])

  const items = useMemo<PaletteItem[]>(() => {
    const remote = remoteQuery.data ?? []
    return [...remote, ...filteredNav]
  }, [remoteQuery.data, filteredNav])

  useEffect(() => { setCursor(0) }, [items.length])

  function run(item: PaletteItem) {
    setOpen(false)
    navigate(item.url)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(items.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const target = items[cursor]
      if (target) run(target)
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<ItemKind, PaletteItem[]> = { client: [], project: [], agent: [], nav: [] }
    for (const it of items) groups[it.kind].push(it)
    return groups
  }, [items])

  const order: ItemKind[] = ['client', 'project', 'agent', 'nav']
  let runningIndex = -1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-xl overflow-hidden border-immo-border-default bg-immo-bg-card p-0"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-immo-border-default px-4 py-3">
          <Search className="h-4 w-4 text-immo-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Chercher un client, projet, agent… ou une page"
            className="flex-1 bg-transparent text-sm text-immo-text-primary outline-none placeholder:text-immo-text-muted"
          />
          <kbd className="rounded border border-immo-border-default bg-immo-bg-primary px-1.5 py-0.5 text-[10px] text-immo-text-muted">ESC</kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto py-1">
          {trimmed.length >= 2 && remoteQuery.isFetching && items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-immo-text-muted">Recherche…</div>
          )}
          {items.length === 0 && !remoteQuery.isFetching && (
            <div className="px-4 py-6 text-center text-xs text-immo-text-muted">
              {trimmed ? 'Aucun résultat' : 'Tape pour chercher ou utilise les flèches'}
            </div>
          )}

          {order.map(kind => {
            const list = grouped[kind]
            if (list.length === 0) return null
            return (
              <div key={kind} className="pb-1">
                <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-immo-text-muted">
                  {KIND_LABEL[kind]}
                </div>
                {list.map(item => {
                  runningIndex += 1
                  const Icon = item.icon
                  const active = runningIndex === cursor
                  const myIndex = runningIndex
                  return (
                    <button
                      key={item.id}
                      onClick={() => run(item)}
                      onMouseEnter={() => setCursor(myIndex)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                        active ? 'bg-immo-accent-green/10 text-immo-text-primary' : 'text-immo-text-primary/90 hover:bg-immo-bg-card-hover'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-immo-accent-green' : 'text-immo-text-muted'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.label}</div>
                        {item.sublabel && (
                          <div className="truncate text-[11px] text-immo-text-muted">{item.sublabel}</div>
                        )}
                      </div>
                      {active && <ArrowRight className="h-3.5 w-3.5 text-immo-accent-green" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-immo-border-default bg-immo-bg-primary/40 px-4 py-2 text-[10px] text-immo-text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-immo-border-default bg-immo-bg-card px-1">↑</kbd>{' '}
              <kbd className="rounded border border-immo-border-default bg-immo-bg-card px-1">↓</kbd> naviguer
            </span>
            <span>
              <kbd className="rounded border border-immo-border-default bg-immo-bg-card px-1">↵</kbd> ouvrir
            </span>
          </div>
          <div>
            <kbd className="rounded border border-immo-border-default bg-immo-bg-card px-1">⌘</kbd>
            <span className="px-1">+</span>
            <kbd className="rounded border border-immo-border-default bg-immo-bg-card px-1">K</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
