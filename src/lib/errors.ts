import toast from 'react-hot-toast'

const ERROR_MESSAGES: Record<string, string> = {
  '23505': 'Cet élément existe déjà (doublon)',
  '23503': 'Impossible de supprimer : des éléments liés existent encore',
  '42501': 'Vous n\'avez pas les droits pour cette action',
  'PGRST116': 'Élément introuvable',
  'PGRST301': 'Trop de résultats, affinez votre recherche',
  '23502': 'Un champ obligatoire est manquant',
}

export function handleSupabaseError(error: { code?: string; message?: string; details?: string }): string {
  const code = error.code ?? ''
  const mapped = ERROR_MESSAGES[code]
  const message = mapped ?? error.message ?? 'Une erreur inattendue est survenue'

  if (import.meta.env.DEV) {
    console.error('[Supabase Error]', { code, message: error.message, details: error.details })
  }

  toast.error(message)
  return message
}

export function handleQueryError(error: unknown): void {
  if (error && typeof error === 'object' && 'code' in error) {
    handleSupabaseError(error as { code?: string; message?: string; details?: string })
  } else if (error instanceof Error) {
    if (import.meta.env.DEV) console.error('[Query Error]', error)
    toast.error(error.message)
  } else {
    toast.error('Une erreur inattendue est survenue')
  }
}

// supabase-js wraps non-2xx Edge Function responses in a FunctionsHttpError
// whose `context` is the raw Response — without parsing it we only see
// "non-2xx status code" and lose the server-side error message. This helper
// extracts the underlying `error` field from the response body.
export async function parseEdgeError(err: unknown): Promise<Error> {
  const fallback = err instanceof Error ? err : new Error('Erreur réseau')
  const ctx = (err as { context?: Response } | null)?.context
  if (!ctx || typeof ctx.text !== 'function') return fallback
  try {
    const text = await ctx.text()
    if (!text) return fallback
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed?.error) return new Error(parsed.error)
    } catch {
      // non-JSON body — use the raw text
    }
    return new Error(text)
  } catch {
    return fallback
  }
}
