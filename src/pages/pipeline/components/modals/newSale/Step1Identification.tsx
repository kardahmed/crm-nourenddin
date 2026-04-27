import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PIPELINE_STAGES } from '@/types'
import { inputClass, labelClass } from './styles'
import type { ClientInfo } from './types'

interface Project {
  id: string
  name: string
  code: string
  status: string
}

interface Step1Props {
  client: ClientInfo
  projects: Project[]
  selectedProjectId: string
  onSelectProject: (id: string) => void
}

export function Step1Identification({ client, projects, selectedProjectId, onSelectProject }: Step1Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const stage = PIPELINE_STAGES[client.pipeline_stage]

  const filtered = useMemo(
    () => projects.filter((p) => {
      if (p.status !== 'active') return false
      if (!search) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    }),
    [projects, search],
  )

  return (
    <div className="space-y-5">
      {/* Client card */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-primary p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-immo-accent-green/15 text-sm font-bold text-immo-accent-green">
            {client.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">{client.full_name}</p>
            <div className="mt-0.5 flex items-center gap-3 text-[11px] text-immo-text-muted">
              <span>{client.phone}</span>
              {client.nin_cin && <span>CIN: {client.nin_cin}</span>}
            </div>
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: stage.color + '20', color: stage.color }}
          >
            {stage.label}
          </span>
        </div>
      </div>

      {/* Project selection */}
      <div>
        <Label className={labelClass}>{t('sale_modal.choose_project')}</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-immo-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sale_modal.search_project')}
            className={`pl-9 ${inputClass}`}
          />
        </div>
        <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-immo-text-muted">{t('sale_modal.no_active_project')}</p>
          ) : (
            filtered.map((p) => {
              const selected = selectedProjectId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProject(p.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? 'border-immo-accent-green/50 bg-immo-accent-green/5'
                      : 'border-immo-border-default bg-immo-bg-card hover:border-immo-text-muted'
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? 'border-immo-accent-green bg-immo-accent-green' : 'border-immo-border-default'
                    }`}
                  >
                    {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <Building2 className="h-4 w-4 shrink-0 text-immo-text-muted" />
                  <div>
                    <p className="text-sm font-medium text-immo-text-primary">{p.name}</p>
                    <p className="text-[11px] text-immo-text-muted">{p.code}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
