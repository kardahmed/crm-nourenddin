import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Archive, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseEdgeError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@/types'
import toast from 'react-hot-toast'

const inputClass =
  'border-immo-border-default bg-immo-bg-primary text-immo-text-primary placeholder:text-immo-text-muted'

type AgentStatus = 'active' | 'inactive' | 'archived'

interface EditAgentModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    role: UserRole
    status: AgentStatus | string
    permission_profile_id?: string | null
  } | null
}

export function EditAgentModal({ isOpen, onClose, user }: EditAgentModalProps) {
  const qc = useQueryClient()
  const currentUserId = useAuthStore(s => s.session?.user?.id)
  const isSelf = user?.id === currentUserId
  const isArchived = user?.status === 'archived'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('agent')
  const [permissionProfileId, setPermissionProfileId] = useState<string | null>(null)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  // Fetch permission profiles for the dropdown (only relevant for admin / agent roles)
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

  // Sync form state with the selected user whenever the modal opens.
  useEffect(() => {
    if (!user) return
    setFirstName(user.first_name)
    setLastName(user.last_name)
    setEmail(user.email)
    setPhone(user.phone ?? '')
    setRole(user.role)
    setPermissionProfileId(user.permission_profile_id ?? null)
    // Archived users keep their status (we never flip them back to active
    // from this modal — reactivation isn't supported by design).
    setStatus(user.status === 'inactive' ? 'inactive' : 'active')
  }, [user])

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Utilisateur introuvable')
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        throw new Error('Nom, prénom et email requis')
      }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      }

      // Only send email if it changed (avoids triggering the auth.users update path)
      if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
        payload.email = email.trim().toLowerCase()
      }
      // Only send role/status if not self-editing and not archived.
      // Archived users are frozen — never flip them back to active via Edit.
      if (!isSelf && !isArchived) {
        if (role !== user.role) payload.role = role
        if (status !== user.status) payload.status = status
      }
      if (permissionProfileId !== (user.permission_profile_id ?? null)) {
        payload.permission_profile_id = permissionProfileId
      }

      const { data, error } = await supabase.functions.invoke('update-user', {
        body: payload,
      })
      if (error) throw await parseEdgeError(error)
      const res = data as { error?: string; success?: boolean }
      if (res?.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents-list'] })
      toast.success('Utilisateur mis à jour')
      onClose()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    },
  })

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Utilisateur introuvable')
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { user_id: user.id, send_password_reset: true },
      })
      if (error) throw await parseEdgeError(error)
      return data as { password_reset_sent?: boolean }
    },
    onSuccess: (data) => {
      if (data?.password_reset_sent) {
        toast.success(`Email de réinitialisation envoyé à ${email}`)
      } else {
        toast.error("L'envoi de l'email a échoué")
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    },
  })

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier l'utilisateur"
      subtitle={`${user.first_name} ${user.last_name}`}
      size="sm"
    >
      <div className="space-y-4">
        {isArchived && (
          <div className="flex items-start gap-2 rounded-lg border border-immo-border-default bg-immo-bg-card p-3 text-[11px] text-immo-text-secondary">
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-immo-text-muted" />
            <div>
              <p className="font-medium text-immo-text-primary">Compte archivé</p>
              <p className="mt-0.5">
                Les informations de contact restent modifiables, mais le rôle et le statut sont verrouillés.
                Pour réintégrer cette personne, créez un nouveau compte.
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-medium text-immo-text-muted">Prénom *</Label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-immo-text-muted">Nom *</Label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">Email *</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
          {email.trim().toLowerCase() !== user.email.toLowerCase() && (
            <p className="mt-1 text-[10px] text-immo-status-orange">
              L'email sera confirmé automatiquement. L'utilisateur devra utiliser le nouvel email pour se connecter.
            </p>
          )}
        </div>

        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">Téléphone</Label>
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0555 123 456"
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">
            Rôle {isSelf && <span className="text-immo-status-orange">(non modifiable sur soi-même)</span>}
            {isArchived && <span className="text-immo-text-muted"> (verrouillé — compte archivé)</span>}
          </Label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            disabled={isSelf || isArchived}
            className={`mt-1 h-9 w-full rounded-md border px-3 text-sm ${inputClass} disabled:opacity-50`}
          >
            <option value="agent">Agent commercial</option>
            <option value="reception">Réception</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>

        {role !== 'reception' && profiles.length > 0 && (
          <div>
            <Label className="text-[11px] font-medium text-immo-text-muted">Profil de permissions</Label>
            <select
              value={permissionProfileId ?? ''}
              onChange={e => setPermissionProfileId(e.target.value || null)}
              className={`mt-1 h-9 w-full rounded-md border px-3 text-sm ${inputClass}`}
            >
              <option value="">— Aucun (défaut) —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label className="text-[11px] font-medium text-immo-text-muted">
            Statut {isSelf && <span className="text-immo-status-orange">(non modifiable sur soi-même)</span>}
            {isArchived && <span className="text-immo-text-muted"> (archivé)</span>}
          </Label>
          {isArchived ? (
            <div className={`mt-1 flex h-9 items-center rounded-md border px-3 text-sm ${inputClass} opacity-60`}>
              Archivé
            </div>
          ) : (
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
              disabled={isSelf}
              className={`mt-1 h-9 w-full rounded-md border px-3 text-sm ${inputClass} disabled:opacity-50`}
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          )}
        </div>

        {/* Password reset action */}
        <div className="rounded-lg border border-immo-border-default bg-immo-bg-card p-3">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-immo-accent-blue" />
            <div className="flex-1">
              <p className="text-xs font-medium text-immo-text-primary">Réinitialiser le mot de passe</p>
              <p className="mt-0.5 text-[11px] text-immo-text-muted">
                Envoie un email de réinitialisation à {email}. L'utilisateur définira son nouveau mot de passe lui-même.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resetPassword.mutate()}
              disabled={resetPassword.isPending}
              className="shrink-0 text-xs text-immo-accent-blue hover:bg-immo-accent-blue/10"
            >
              {resetPassword.isPending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-immo-border-default pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-immo-text-secondary hover:bg-immo-bg-card-hover"
          >
            Annuler
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !firstName || !lastName || !email}
            className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            {save.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-immo-bg-primary border-t-transparent" />
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
