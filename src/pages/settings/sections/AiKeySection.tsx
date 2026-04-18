import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Save, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

type KeyPreview = { configured: false } | { configured: true; preview: string; length: number }

export function AiKeySection() {
  const qc = useQueryClient()
  const { role } = useAuthStore()
  const isAdmin = role === 'admin'

  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const { data: preview, isLoading } = useQuery({
    queryKey: ['anthropic-key-preview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_anthropic_api_key_preview' as never)
      if (error) throw error
      return data as unknown as KeyPreview
    },
    enabled: isAdmin,
  })

  const save = useMutation({
    mutationFn: async () => {
      const key = newKey.trim()
      if (key && !key.startsWith('sk-ant-')) {
        throw new Error('La clé doit commencer par sk-ant-')
      }
      const { error } = await supabase.rpc('set_anthropic_api_key' as never, { new_key: key } as never)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anthropic-key-preview'] })
      setNewKey('')
      toast.success('Clé API enregistrée')
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la sauvegarde'),
  })

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_anthropic_api_key' as never, { new_key: '' } as never)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anthropic-key-preview'] })
      toast.success('Clé supprimée')
    },
  })

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-6">
        <p className="text-sm text-immo-text-muted">Seuls les administrateurs peuvent gérer la clé API.</p>
      </div>
    )
  }

  const isConfigured = preview?.configured === true

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-immo-text-primary">Clé API Anthropic</h2>
        <p className="text-xs text-immo-text-muted">
          Cette clé permet la génération IA des scripts d'appel et le classement intelligent des biens.
          Obtenez-la sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-immo-accent-green underline">console.anthropic.com</a>.
        </p>
      </div>

      {/* Status */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${
        isConfigured
          ? 'border-immo-accent-green/30 bg-immo-accent-green/5'
          : 'border-immo-status-orange/30 bg-immo-status-orange/5'
      }`}>
        {isConfigured ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-immo-accent-green" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-immo-status-orange" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-immo-text-primary">
            {isLoading ? 'Vérification...' : isConfigured ? 'Clé configurée' : 'Aucune clé configurée'}
          </p>
          {isConfigured && preview.configured && (
            <p className="mt-1 font-mono text-xs text-immo-text-muted">
              {preview.preview} ({preview.length} caractères)
            </p>
          )}
          {!isConfigured && !isLoading && (
            <p className="mt-1 text-xs text-immo-text-muted">
              Les fonctionnalités IA utiliseront les modèles de script par défaut jusqu'à ce qu'une clé soit configurée.
            </p>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-immo-text-primary">
          <Sparkles className="h-4 w-4 text-purple-500" />
          {isConfigured ? 'Remplacer la clé' : 'Ajouter une clé'}
        </h3>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="pr-10 font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-immo-text-muted hover:text-immo-text-primary"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !newKey.trim()}
            className="bg-immo-accent-green font-semibold text-white hover:bg-immo-accent-green/90"
          >
            <Save className="mr-1.5 h-4 w-4" /> {save.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>

        <p className="mt-2 text-[10px] text-immo-text-muted">
          La clé est stockée chiffrée côté base de données et n'est jamais exposée aux agents. Elle est utilisée uniquement côté serveur par les fonctions IA.
        </p>

        {isConfigured && (
          <button
            onClick={() => {
              if (confirm('Supprimer la clé API ? Les fonctionnalités IA basculeront sur les modèles par défaut.')) {
                clear.mutate()
              }
            }}
            disabled={clear.isPending}
            className="mt-3 text-xs text-immo-status-red hover:underline"
          >
            {clear.isPending ? 'Suppression...' : 'Supprimer la clé'}
          </button>
        )}
      </div>
    </div>
  )
}
