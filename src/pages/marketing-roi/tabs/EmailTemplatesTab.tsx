import { useState } from 'react'
import { Plus, FileText, Pencil, Trash2, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEmailTemplates, useDeleteTemplate, useSaveTemplate } from '@/hooks/useEmailMarketing'
import { LoadingSpinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { TemplateEditor } from '../components/TemplateEditor'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { EmailBlock } from '@/lib/blocksToHtml'

export function EmailTemplatesTab() {
  const { t } = useTranslation()
  const { data: templates = [], isLoading } = useEmailTemplates()
  const deleteTemplate = useDeleteTemplate()
  const saveTemplate = useSaveTemplate()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{ id: string; name: string; subject: string; blocks: EmailBlock[] } | undefined>()

  const handleNew = () => {
    setEditingTemplate(undefined)
    setEditorOpen(true)
  }

  const handleEdit = (tpl: typeof templates[0]) => {
    setEditingTemplate({ id: tpl.id, name: tpl.name, subject: tpl.subject, blocks: tpl.blocks })
    setEditorOpen(true)
  }

  const handleDuplicate = async (tpl: typeof templates[0]) => {
    try {
      await saveTemplate.mutateAsync({
        name: `${tpl.name} (copie)`,
        subject: tpl.subject,
        blocks: tpl.blocks,
        html_cache: tpl.html_cache ?? '',
      })
      toast.success(t('marketing.template_duplicated'))
    } catch {
      toast.error(t('marketing.error_generic'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id)
      toast.success(t('marketing.template_deleted'))
    } catch {
      toast.error(t('marketing.error_generic'))
    }
  }

  if (editorOpen) {
    return <TemplateEditor initialTemplate={editingTemplate} onClose={() => setEditorOpen(false)} />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-immo-text-primary">Templates Email</h3>
          <p className="text-xs text-immo-text-muted mt-0.5">{templates.length} template(s)</p>
        </div>
        <Button onClick={handleNew} className="gap-1.5 bg-immo-accent-green hover:bg-immo-accent-green/90 text-white text-xs">
          <Plus className="h-3.5 w-3.5" /> Nouveau template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-immo-border-default p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-immo-text-muted mb-3" />
          <p className="text-sm font-medium text-immo-text-primary">{t('marketing.no_templates')}</p>
          <p className="text-xs text-immo-text-muted mt-1">Créez votre premier template d'email marketing</p>
          <Button onClick={handleNew} className="mt-4 gap-1.5 text-xs" variant="outline"><Plus className="h-3.5 w-3.5" /> Créer</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4 space-y-3 hover:border-immo-accent-green/30 transition-colors">
              {/* Preview thumbnail */}
              <div className="h-32 rounded-lg bg-immo-bg-primary border border-immo-border-default/50 overflow-hidden">
                {tpl.html_cache ? (
                  <iframe srcDoc={tpl.html_cache} className="w-full h-full pointer-events-none" style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: '250%', height: '250%' }} sandbox="" title={tpl.name} />
                ) : (
                  <div className="flex items-center justify-center h-full text-immo-text-muted"><FileText className="h-8 w-8" /></div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-immo-text-primary truncate">{tpl.name}</h4>
                <p className="text-[11px] text-immo-text-muted mt-0.5">
                  {tpl.subject || 'Sans objet'} · {tpl.blocks.length} bloc(s)
                </p>
                <p className="text-[10px] text-immo-text-muted mt-1">
                  Modifié le {format(new Date(tpl.updated_at), 'dd/MM/yy HH:mm')}
                </p>
              </div>

              <div className="flex gap-1.5 pt-1">
                <Button variant="outline" size="sm" onClick={() => handleEdit(tpl)} className="flex-1 gap-1 text-xs">
                  <Pencil className="h-3 w-3" /> Modifier
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(tpl)} className="text-xs px-2">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl.id)} className="text-xs px-2 hover:text-immo-status-red">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
