import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Camera, Lock, Trash2, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionHeader, Field, inputClass } from './shared'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ProfileSection() {
  const { t } = useTranslation()
  const { userProfile, setUserProfile } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Personal info state ──────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (userProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding form state from profile query
      setFirstName(userProfile.first_name ?? '')
      setLastName(userProfile.last_name ?? '')
      setPhone(userProfile.phone ?? '')
    }
  }, [userProfile])

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!userProfile) throw new Error('Session expirée')
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', userProfile.id)
        .select()
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: (data) => {
      setUserProfile(data)
      toast.success('Profil mis à jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Avatar upload ────────────────────────────────────────────
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!userProfile) throw new Error('Session expirée')
      if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
        throw new Error('Format non supporté (JPG, PNG ou WebP uniquement)')
      }
      if (file.size > MAX_AVATAR_BYTES) {
        throw new Error('Fichier trop lourd (2 Mo max)')
      }
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${userProfile.id}/avatar.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr

      // Cache-buster so the browser reloads the new image.
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

      const { data, error } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userProfile.id)
        .select()
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: (data) => {
      setUserProfile(data)
      toast.success('Photo mise à jour')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeAvatar = useMutation({
    mutationFn: async () => {
      if (!userProfile) throw new Error('Session expirée')
      // Best-effort cleanup of every possible extension.
      await supabase.storage.from('avatars').remove([
        `${userProfile.id}/avatar.jpg`,
        `${userProfile.id}/avatar.png`,
        `${userProfile.id}/avatar.webp`,
      ])
      const { data, error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', userProfile.id)
        .select()
        .single()
      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: (data) => {
      setUserProfile(data)
      toast.success('Photo supprimée')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Password change ──────────────────────────────────────────
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPass.length < 8) throw new Error('Minimum 8 caractères')
      if (newPass !== confirmPass) throw new Error('Les mots de passe ne correspondent pas')
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      toast.success('Mot de passe mis à jour')
      setNewPass('')
      setConfirmPass('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '??'
  const avatar = userProfile?.avatar_url

  return (
    <div className="space-y-8">
      <SectionHeader title="Mon profil" subtitle="Vos informations personnelles et sécurité du compte" />

      {/* ── Avatar ── */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-2 ring-immo-accent-green/30"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-immo-accent-green/15 text-xl font-bold text-immo-accent-green ring-2 ring-immo-accent-green/30">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-immo-accent-green text-immo-bg-primary shadow-md transition-transform hover:scale-110 disabled:opacity-50"
              aria-label="Changer la photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-immo-text-primary">Photo de profil</p>
            <p className="mt-0.5 text-xs text-immo-text-muted">JPG, PNG ou WebP — 2 Mo max</p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="h-8 bg-immo-accent-green text-xs font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
              >
                {uploadAvatar.isPending ? 'Envoi…' : 'Changer la photo'}
              </Button>
              {avatar && (
                <Button
                  variant="ghost"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                  className="h-8 text-xs text-immo-status-red hover:bg-immo-status-red/10 hover:text-immo-status-red"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Retirer
                </Button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAvatar.mutate(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* ── Personal info ── */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-immo-accent-green" />
          <h3 className="text-sm font-semibold text-immo-text-primary">Informations personnelles</h3>
        </div>

        <div className="grid max-w-2xl gap-4 md:grid-cols-2">
          <Field label="Prénom">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Nom">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Téléphone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0550 12 34 56" className={inputClass} />
          </Field>
          <Field label="Email (non modifiable)">
            <Input value={userProfile?.email ?? ''} disabled className={`${inputClass} opacity-60`} />
          </Field>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending || !firstName.trim() || !lastName.trim()}
            className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
          >
            {saveProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* ── Password ── */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-immo-accent-green" />
          <h3 className="text-sm font-semibold text-immo-text-primary">Mot de passe</h3>
        </div>

        <div className="grid max-w-md gap-4">
          <Field label="Nouveau mot de passe">
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min. 8 caractères" className={inputClass} />
          </Field>
          <Field label="Confirmer">
            <Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className={inputClass} />
            {confirmPass && newPass !== confirmPass && (
              <p className="mt-1 text-[11px] text-immo-status-red">Les mots de passe ne correspondent pas</p>
            )}
          </Field>
          <div>
            <Button
              onClick={() => changePassword.mutate()}
              disabled={!newPass || !confirmPass || newPass !== confirmPass || changePassword.isPending}
              className="bg-immo-accent-green font-semibold text-immo-bg-primary hover:bg-immo-accent-green/90"
            >
              <Lock className="mr-1.5 h-4 w-4" />
              {changePassword.isPending ? t('common.loading') : 'Changer le mot de passe'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
