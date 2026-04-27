import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  Bookmark,
  Home,
  Pencil,
  Archive,
  Image as ImageIcon,
  Clock,
  Upload,
  X as XIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { randomToken } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { usePermissions } from '@/hooks/usePermissions'
import { KPICard, StatusBadge, LoadingSpinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatPrice, formatPriceCompact } from '@/lib/constants'
import { HISTORY_TYPE_LABELS } from '@/types'
import { UnitComparator } from './components/UnitComparator'
import { CsvImportModal } from '@/components/common/CsvImportModal'
import { UNIT_IMPORT_FIELDS } from './unitImportFields'
import { useQueryClient } from '@tanstack/react-query'
import type { Unit, HistoryType } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { fr as frLocale } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

const STATUS_MAP: Record<string, { labelKey: string; type: 'green' | 'muted' | 'red' }> = {
  active: { labelKey: 'status.active', type: 'green' },
  inactive: { labelKey: 'status.inactive', type: 'muted' },
  archived: { labelKey: 'status.archived', type: 'red' },
}

const UNIT_STATUS_BADGE: Record<string, { labelKey: string; type: 'green' | 'orange' | 'blue' | 'red' | 'muted' }> = {
  available: { labelKey: 'status.available', type: 'green' },
  reserved: { labelKey: 'status.reserved', type: 'orange' },
  sold: { labelKey: 'status.sold', type: 'blue' },
  blocked: { labelKey: 'status.blocked', type: 'red' },
}

interface ProjectHistory {
  id: string
  type: string
  title: string
  client_name: string
  agent_name: string
  created_at: string
}

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { updateProject } = useProjects()
  const { canManageProjects } = usePermissions()
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showComparator, setShowComparator] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null)
  const [showImportUnits, setShowImportUnits] = useState(false)
  const qc = useQueryClient()

  async function uploadImage(file: File): Promise<string | null> {
    if (!projectId) return null
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      toast.error(t('error.unsupported_format'))
      return null
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('project_detail.file_too_large'))
      return null
    }
    // eslint-disable-next-line react-hooks/purity -- inside async upload handler, not render
    const path = `projects/${projectId}/${Date.now()}-${randomToken(8)}.${ext}`
    const { error } = await supabase.storage.from('landing-assets').upload(path, file, { upsert: false })
    if (error) {
      toast.error(t('project_detail.upload_error', { message: error.message }))
      return null
    }
    const { data: urlData } = supabase.storage.from('landing-assets').getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !projectId) return
    setUploading('cover')
    const url = await uploadImage(file)
    if (url) {
      await updateProject.mutateAsync({ id: projectId, cover_url: url } as never)
      toast.success(t('project_detail.cover_updated'))
    }
    setUploading(null)
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !projectId) return
    setUploading('gallery')
    const urls: string[] = []
    for (const file of files) {
      const url = await uploadImage(file)
      if (url) urls.push(url)
    }
    if (urls.length && project) {
      const current = (project.gallery_urls ?? []) as string[]
      await updateProject.mutateAsync({ id: projectId, gallery_urls: [...current, ...urls] } as never)
      toast.success(t('project_detail.images_added', { count: urls.length }))
    }
    setUploading(null)
  }

  async function removeGalleryImage(url: string) {
    if (!projectId || !project) return
    const current = (project.gallery_urls ?? []) as string[]
    const next = current.filter((u) => u !== url)
    await updateProject.mutateAsync({ id: projectId, gallery_urls: next } as never)
    setGalleryIndex(0)
    toast.success(t('project_detail.image_removed'))
  }

  // Fetch project with units
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    enabled: !!projectId,
  })

  const { data: rawUnits = [] } = useQuery({
    queryKey: ['units', 'project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('project_id', projectId!)
        .order('code')
      if (error) { handleSupabaseError(error); throw error }
      return data as unknown as Unit[]
    },
    enabled: !!projectId,
  })
  const units = rawUnits as Unit[]

  // Fetch history for units of this project
  const { data: historyRaw = [] } = useQuery({
    queryKey: ['project-history', projectId],
    queryFn: async () => {
      // Get client IDs linked to this project's units
      const unitClientIds = units
        .filter((u) => u.client_id)
        .map((u) => u.client_id!)

      if (unitClientIds.length === 0) return []

      const { data, error } = await supabase
        .from('history')
        .select('id, type, title, created_at, clients(full_name), users!history_agent_id_fkey(first_name, last_name)')
        .in('client_id', unitClientIds)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    enabled: units.length > 0,
  })

  const history: ProjectHistory[] = useMemo(() => {
    return (historyRaw as unknown as Array<Record<string, unknown>>).map((h) => {
      const client = h.clients as { full_name: string } | null
      const agent = h.users as { first_name: string; last_name: string } | null
      return {
        id: h.id as string,
        type: h.type as string,
        title: h.title as string,
        client_name: client?.full_name ?? '-',
        agent_name: agent ? `${agent.first_name} ${agent.last_name}` : '-',
        created_at: h.created_at as string,
      }
    })
  }, [historyRaw])

  // Stats
  const total = units.length
  const sold = units.filter((u) => u.status === 'sold').length
  const reserved = units.filter((u) => u.status === 'reserved').length
  const available = units.filter((u) => u.status === 'available').length
  const revenue = units.filter((u) => u.status === 'sold').reduce((s, u) => s + (u.price ?? 0), 0)
  const progress = total > 0 ? ((sold + reserved) / total) * 100 : 0

  const gallery = project?.gallery_urls ?? []
  const coverUrl = project?.cover_url

  if (isLoading || !project) {
    return <LoadingSpinner size="lg" className="h-96" />
  }

  const st = STATUS_MAP[project.status] ?? STATUS_MAP.inactive

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-immo-text-muted">
        <Link to="/projects" className="hover:text-immo-text-primary">{t('nav.projects')}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-immo-text-primary">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="text-immo-text-muted hover:text-immo-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {editMode ? (
              <div className="space-y-2">
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t('project_detail.project_name_placeholder')} className="h-9 w-full border-immo-border-default text-sm sm:w-[300px]" />
                <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder={t('project_detail.location_placeholder')} className="h-9 w-full border-immo-border-default text-sm sm:w-[300px]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => {
                    await updateProject.mutateAsync({ id: project.id, name: editName, location: editLocation })
                    setEditMode(false)
                    toast.success(t('project_detail.project_updated'))
                  }} className="bg-immo-accent-green text-white text-xs">{t('action.save')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} className="text-xs text-immo-text-secondary">{t('action.cancel')}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-immo-text-primary">{project.name}</h1>
                  <span className="text-sm text-immo-text-muted">{project.code}</span>
                  <StatusBadge label={t(st.labelKey)} type={st.type} />
                </div>
                {project.location && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-immo-text-muted">
                    <MapPin className="h-3.5 w-3.5" /> {project.location}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {canManageProjects && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditName(project.name); setEditLocation(project.location ?? ''); setEditMode(!editMode) }}
              className="border border-immo-border-default text-immo-text-secondary hover:bg-immo-bg-card-hover hover:text-immo-text-primary"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t('action.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateProject.mutate({ id: project.id, status: 'archived' })}
              className="border border-immo-border-default text-immo-text-secondary hover:bg-immo-status-red-bg hover:text-immo-status-red"
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" /> {t('action.archive')}
            </Button>
          </div>
        )}
      </div>

      {/* Gallery + Info */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Gallery */}
        <div className="xl:w-[480px]">
          <div className="overflow-hidden rounded-xl border border-immo-border-default bg-immo-bg-card">
            {/* Main image */}
            <div className="relative h-[280px] bg-immo-bg-primary">
              {(gallery.length > 0 || coverUrl) ? (
                <img
                  src={gallery[galleryIndex] ?? coverUrl ?? ''}
                  alt={project.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-immo-text-muted">
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-sm">{t('project_detail.no_photo')}</span>
                </div>
              )}

              {/* Admin controls overlay */}
              {canManageProjects && (
                <div className="absolute right-3 top-3 flex gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80">
                    {uploading === 'cover' ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                    {t('project_detail.cover')}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploading !== null} />
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80">
                    {uploading === 'gallery' ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {t('project_detail.add_image')}
                    <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" disabled={uploading !== null} />
                  </label>
                </div>
              )}

              {/* Remove current image button (admin + gallery image) */}
              {canManageProjects && gallery.length > 0 && gallery[galleryIndex] && (
                <button
                  onClick={() => removeGalleryImage(gallery[galleryIndex])}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-immo-status-red/90"
                  title={t('project_detail.remove_photo_title')}
                >
                  <XIcon className="h-3.5 w-3.5" />
                  {t('project_detail.remove')}
                </button>
              )}
            </div>
            {/* Thumbnails */}
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {gallery.map((url: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                      i === galleryIndex ? 'border-immo-accent-green' : 'border-immo-border-default'
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-immo-text-primary">{t('project_detail.info')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={<Building2 className="h-4 w-4" />} label={t('project_detail.description')} value={project.description ?? '-'} full />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('project_detail.location')} value={project.location ?? '-'} />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label={t('project_detail.delivery_date')}
                value={project.delivery_date ? format(new Date(project.delivery_date), 'dd/MM/yyyy') : '-'}
              />
              <InfoRow
                icon={<DollarSign className="h-4 w-4" />}
                label={t('project_detail.avg_price_per_unit')}
                value={project.avg_price_per_unit != null ? formatPrice(project.avg_price_per_unit) : '-'}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label={t('project_detail.created_at')}
                value={format(new Date(project.created_at), 'dd/MM/yyyy')}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            <KPICard label={t('units_tab.total')} value={total} accent="blue" icon={<Home className="h-4 w-4 text-immo-accent-blue" />} />
            <KPICard label={t('project_detail.sold')} value={sold} accent="green" icon={<CheckCircle className="h-4 w-4 text-immo-accent-green" />} />
            <KPICard label={t('project_detail.reserved')} value={reserved} accent="orange" icon={<Bookmark className="h-4 w-4 text-immo-status-orange" />} />
            <KPICard label={t('project_detail.available')} value={available} accent="blue" icon={<Home className="h-4 w-4 text-immo-accent-blue" />} />
            <KPICard label={t('project_detail.project_revenue')} value={formatPriceCompact(revenue)} accent="green" icon={<DollarSign className="h-4 w-4 text-immo-accent-green" />} />
          </div>

          {/* Progress */}
          <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-immo-text-secondary">{t('project_detail.marketed', { done: sold + reserved, total })}</span>
              <span className="font-semibold text-immo-text-primary">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-immo-bg-primary">
              <div className="flex h-full">
                {sold > 0 && <div className="bg-immo-accent-green" style={{ width: `${(sold / total) * 100}%` }} />}
                {reserved > 0 && <div className="bg-immo-status-orange" style={{ width: `${(reserved / total) * 100}%` }} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-immo-border-default" />

      {/* Units table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-immo-text-primary">
            {t('project_detail.units_count', { count: units.length })}
          </h3>
          <div className="flex items-center gap-2">
            {canManageProjects && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowImportUnits(true)}
                className="border border-immo-border-default text-immo-text-secondary text-xs hover:bg-immo-bg-card-hover"
                title={t('project_detail.import_csv_hint')}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> {t('project_detail.import_csv')}
              </Button>
            )}
            {compareIds.length >= 2 && (
              <Button
                size="sm"
                onClick={() => setShowComparator(true)}
                className="bg-immo-accent-green text-white text-xs"
              >
                {t('project_detail.compare')} ({compareIds.length})
              </Button>
            )}
          </div>
        </div>
        {units.length === 0 ? (
          <div className="rounded-xl border border-immo-border-default bg-immo-bg-card py-12 text-center text-sm text-immo-text-muted">
            {t('project_detail.no_units')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-immo-border-default">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-immo-bg-card-hover">
                    <th className="w-10 px-3 py-3" />
                    {[t('units_tab.code'), t('units_tab.type'), t('units_tab.building'), t('units_tab.floor'), t('units_tab.surface'), t('units_tab.price'), t('units_tab.status')].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-immo-border-default">
                  {units.map((u) => {
                    const ub = UNIT_STATUS_BADGE[u.status] ?? UNIT_STATUS_BADGE.available
                    const isSelected = compareIds.includes(u.id)
                    return (
                      <tr key={u.id} className={`transition-colors ${isSelected ? 'bg-immo-accent-green/5' : 'bg-immo-bg-card hover:bg-immo-bg-card-hover'}`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setCompareIds(prev =>
                                prev.includes(u.id)
                                  ? prev.filter(id => id !== u.id)
                                  : [...prev, u.id]
                              )
                            }}
                            className="h-4 w-4 rounded border-immo-border-default accent-immo-accent-green"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-immo-text-primary">{u.code}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-immo-text-secondary">{u.type}{u.subtype ? ` ${u.subtype}` : ''}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-immo-text-muted">{u.building ?? '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-immo-text-muted">{u.floor ?? '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">{u.surface != null ? `${u.surface} m²` : '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-immo-text-primary">{u.price != null ? formatPrice(u.price) : '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge label={t(ub.labelKey)} type={ub.type} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unit Comparator */}
        {showComparator && compareIds.length >= 2 && (
          <div className="mt-4">
            <UnitComparator
              units={units.filter(u => compareIds.includes(u.id))}
              onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))}
              onClose={() => { setShowComparator(false); setCompareIds([]) }}
            />
          </div>
        )}

        {/* Unit CSV Import — scoped to the current project */}
        <CsvImportModal
          isOpen={showImportUnits}
          onClose={() => setShowImportUnits(false)}
          title={t('project_detail.import_units_title', { project: project.name })}
          subtitle={t('project_detail.import_units_subtitle')}
          table="units"
          fields={UNIT_IMPORT_FIELDS}
          templateName={`biens-${project.code ?? 'projet'}`}
          defaults={() => ({ project_id: projectId })}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['project-detail', projectId] })
            qc.invalidateQueries({ queryKey: ['units'] })
          }}
        />
      </div>

      {/* Activity history */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold text-immo-text-primary">
            {t('project_detail.activity')}
          </h3>
          <div className="rounded-xl border border-immo-border-default bg-immo-bg-card">
            <div className="max-h-[400px] divide-y divide-immo-border-default overflow-y-auto">
              {history.map((h) => {
                const meta = HISTORY_TYPE_LABELS[h.type as HistoryType]
                return (
                  <div key={h.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-immo-accent-green" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-immo-text-primary">{meta?.label ?? h.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-immo-text-muted">
                        <span>{h.client_name}</span>
                        <span>&middot;</span>
                        <span>{h.agent_name}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-immo-text-muted">
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: frLocale })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, full }: { icon: React.ReactNode; label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="flex items-center gap-2 text-xs text-immo-text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm text-immo-text-primary">{value}</p>
    </div>
  )
}
