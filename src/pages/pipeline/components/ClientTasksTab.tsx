import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Clock, Send, Phone, MessageCircle, Mail, AlertTriangle, Zap, SkipForward, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { StatusBadge, Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { PIPELINE_STAGES } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const inputClass = 'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'

interface ClientTask {
  id: string; title: string; description: string | null; stage: string
  status: string; priority: string; channel: string; scheduled_at: string | null
  executed_at: string | null; completed_at: string | null; message_sent: string | null
  template_id: string | null; bundle_id: string | null
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; type: 'green' | 'orange' | 'blue' | 'muted' | 'red' }> = {
  pending: { label: 'A faire', type: 'orange' },
  scheduled: { label: 'Programme', type: 'blue' },
  in_progress: { label: 'En cours', type: 'blue' },
  completed: { label: 'Fait', type: 'green' },
  skipped: { label: 'Ignore', type: 'muted' },
  cancelled: { label: 'Annule', type: 'red' },
}

const CHANNEL_ICONS: Record<string, typeof Phone> = { whatsapp: MessageCircle, sms: Mail, call: Phone, email: Mail, system: Zap }

interface Props {
  clientId: string
  clientName: string
  clientPhone: string
}

export function ClientTasksTab({ clientId, clientName, clientPhone }: Props) {
  const userId = useAuthStore(s => s.session?.user?.id)
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [showCreate, setShowCreate] = useState(false)

  // Client tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['client-tasks', clientId],
    queryFn: async () => {
      const { data } = await supabase.from('client_tasks').select('*').eq('client_id', clientId).order('created_at')
      return (data ?? []) as ClientTask[]
    },
  })

  const createTask = useMutation({
    mutationFn: async (input: { title: string; description: string; channel: string; priority: string; scheduled_at: string | null }) => {
      const { error } = await supabase.from('client_tasks').insert({
        client_id: clientId,
        agent_id: userId,
        title: input.title,
        description: input.description || null,
        channel: input.channel,
        priority: input.priority,
        scheduled_at: input.scheduled_at,
        status: 'pending',
      } as never)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-tasks', clientId] })
      toast.success('Tâche créée')
      setShowCreate(false)
    },
  })

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('client_tasks').update({
        status: 'completed', completed_at: new Date().toISOString(), executed_at: new Date().toISOString(),
      } as never).eq('id', taskId)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }); toast.success('Tâche terminée') },
  })

  const skipTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('client_tasks').update({ status: 'skipped' } as never).eq('id', taskId)
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }),
  })

  // Execute task: open WhatsApp / SMS with pre-written message
  function executeTask(task: ClientTask) {
    const cleanPhone = clientPhone.replace(/\s+/g, '').replace(/^0/, '213')

    if (task.channel === 'whatsapp') {
      const msg = task.message_sent || `Bonjour ${clientName.split(' ')[0]}`
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
      completeTask.mutate(task.id)
    } else if (task.channel === 'sms') {
      window.open(`sms:${clientPhone}?body=${encodeURIComponent(task.message_sent || '')}`, '_blank')
      completeTask.mutate(task.id)
    } else if (task.channel === 'call') {
      window.open(`tel:${clientPhone}`, '_blank')
      // Don't auto-complete call tasks - agent decides after
    } else {
      completeTask.mutate(task.id)
    }

    // Log in history
    supabase.from('history').insert({
      client_id: clientId, agent_id: userId,
      type: task.channel === 'whatsapp' ? 'whatsapp_message' : task.channel === 'sms' ? 'sms' : task.channel === 'call' ? 'call' : 'note',
      title: `Tache executee: ${task.title}`,
    } as never)
  }

  const filtered = tasks.filter(t =>
    filter === 'all' ? true :
    filter === 'pending' ? ['pending', 'scheduled', 'in_progress'].includes(t.status) :
    ['completed', 'skipped'].includes(t.status)
  )

  const pendingCount = tasks.filter(t => ['pending', 'scheduled'].includes(t.status)).length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-immo-text-primary">Taches ({pendingCount} en attente)</h3>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-24 rounded-full bg-immo-border-default">
              <div className="h-full rounded-full bg-immo-accent-green transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-immo-text-muted">{progress}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-immo-border-default p-0.5">
            {(['pending', 'completed', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${filter === f ? 'bg-immo-accent-green/10 text-immo-accent-green' : 'text-immo-text-muted'}`}>
                {f === 'pending' ? 'A faire' : f === 'completed' ? 'Terminees' : 'Toutes'}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
            <Plus className="mr-1 h-3.5 w-3.5" /> Tâche
          </Button>
        </div>
      </div>

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-immo-accent-green/30" />
          <p className="text-sm text-immo-text-muted">
            {tasks.length === 0 ? 'Aucune tâche pour cette étape. Les tâches sont créées automatiquement au changement d\'étape.' : 'Toutes les tâches sont terminées !'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const st = STATUS_MAP[task.status] ?? STATUS_MAP.pending
            const ChannelIcon = CHANNEL_ICONS[task.channel] ?? Zap
            const isPending = ['pending', 'scheduled'].includes(task.status)
            const isOverdue = task.scheduled_at && new Date(task.scheduled_at) < new Date() && isPending

            return (
              <div key={task.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  task.status === 'completed' ? 'border-immo-accent-green/20 bg-immo-accent-green/5 opacity-60' :
                  isOverdue ? 'border-immo-status-red/30 bg-immo-status-red/5' :
                  'border-immo-border-default hover:border-immo-accent-green/30'
                }`}>
                {/* Status checkbox */}
                <button onClick={() => isPending ? completeTask.mutate(task.id) : null}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    task.status === 'completed' ? 'border-immo-accent-green bg-immo-accent-green text-white' :
                    'border-immo-border-default hover:border-immo-accent-green'
                  }`}>
                  {task.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                </button>

                {/* Channel icon */}
                <ChannelIcon className={`h-4 w-4 shrink-0 ${
                  task.channel === 'whatsapp' ? 'text-[#25D366]' :
                  task.channel === 'call' ? 'text-immo-accent-blue' :
                  'text-immo-text-muted'
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${task.status === 'completed' ? 'text-immo-text-muted line-through' : 'text-immo-text-primary'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.scheduled_at && isPending && (
                      <span className={`text-[9px] flex items-center gap-0.5 ${isOverdue ? 'text-immo-status-red font-medium' : 'text-immo-text-muted'}`}>
                        <Clock className="h-2.5 w-2.5" />
                        {isOverdue ? 'En retard — ' : ''}{formatDistanceToNow(new Date(task.scheduled_at), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-[9px] text-immo-text-muted">Fait {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true, locale: fr })}</span>
                    )}
                  </div>
                </div>

                {/* Priority */}
                {task.priority === 'high' || task.priority === 'urgent' ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-immo-status-orange" />
                ) : null}

                {/* Status badge */}
                <StatusBadge label={st.label} type={st.type} />

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-1 shrink-0">
                    {task.channel !== 'system' && (
                      <button onClick={() => executeTask(task)} title="Executer"
                        className="flex items-center gap-1 rounded-md bg-immo-accent-green/10 px-2 py-1 text-[10px] font-medium text-immo-accent-green hover:bg-immo-accent-green/20">
                        <Send className="h-3 w-3" /> Executer
                      </button>
                    )}
                    <button onClick={() => skipTask.mutate(task.id)} title="Ignorer"
                      className="rounded-md p-1 text-immo-text-muted hover:bg-immo-bg-card-hover">
                      <SkipForward className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(d) => createTask.mutate(d)}
        loading={createTask.isPending}
      />
    </div>
  )
}

function CreateTaskModal({ isOpen, onClose, onSubmit, loading }: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (d: { title: string; description: string; channel: string; priority: string; scheduled_at: string | null }) => void
  loading: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState('system')
  const [priority, setPriority] = useState('normal')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')

  function handle() {
    if (!title.trim()) return
    const scheduled_at = date ? `${date}T${time}:00` : null
    onSubmit({ title: title.trim(), description: description.trim(), channel, priority, scheduled_at })
    setTitle(''); setDescription(''); setChannel('system'); setPriority('normal'); setDate(''); setTime('09:00')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle tâche" size="sm">
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-immo-text-secondary">Titre *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rappeler le client..." className={inputClass} />
        </div>
        <div>
          <Label className="text-xs text-immo-text-secondary">Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails optionnels..."
            rows={3}
            className={`w-full resize-none rounded-md border px-3 py-2 text-sm ${inputClass}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-immo-text-secondary">Canal</Label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
              <option value="system">Manuelle</option>
              <option value="call">Appel</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-immo-text-secondary">Priorité</Label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}>
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-immo-text-secondary">Date (optionnel)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-xs text-immo-text-secondary">Heure</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-immo-text-secondary">Annuler</Button>
          <Button onClick={handle} disabled={!title.trim() || loading} className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90">
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" /> : 'Créer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
