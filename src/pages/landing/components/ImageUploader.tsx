import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface ImageUploaderProps {
  /** Current image URL */
  value?: string
  /** Callback with the public URL */
  onChange: (url: string) => void
  /** Label displayed */
  label?: string
  /** Accept multiple files */
  multiple?: boolean
  /** Callback for multiple URLs */
  onMultiple?: (urls: string[]) => void
}

export function ImageUploader({ value, onChange, label, multiple = false, onMultiple }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tenantId = useAuthStore(s => s.tenantId)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    const urls: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast.error(`${file.name} : type non supporte`)
          continue
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB max
          toast.error(`${file.name} : taille max 10MB`)
          continue
        }

        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${tenantId ?? 'public'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error } = await supabase.storage
          .from('landing-assets')
          .upload(path, file, { contentType: file.type })

        if (error) {
          toast.error(`Upload echoue: ${error.message}`)
          continue
        }

        const { data: urlData } = supabase.storage.from('landing-assets').getPublicUrl(path)
        urls.push(urlData.publicUrl)
      }

      if (urls.length > 0) {
        if (multiple && onMultiple) {
          onMultiple(urls)
        } else {
          onChange(urls[0])
        }
        toast.success(`${urls.length} fichier(s) uploade(s)`)
      }
    } catch (err) {
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      {label && <p className="mb-1 text-[10px] font-medium text-immo-text-muted">{label}</p>}

      {/* Preview */}
      {value && !multiple && (
        <div className="relative mb-2 inline-block">
          {value.match(/\.(mp4|webm|mov)$/i) ? (
            <video src={value} className="h-20 rounded-lg object-cover" controls />
          ) : (
            <img src={value} alt="" className="h-20 rounded-lg object-cover" />
          )}
          <button
            onClick={() => onChange('')}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-immo-status-red text-white shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 rounded-lg border border-dashed border-immo-border-default bg-immo-bg-primary px-4 py-3 text-xs text-immo-text-muted transition-colors hover:border-immo-accent-green hover:text-immo-accent-green"
      >
        {uploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Upload en cours...</>
        ) : (
          <><Upload className="h-4 w-4" /> {multiple ? 'Uploader des fichiers' : 'Uploader un fichier'}</>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        multiple={multiple}
        onChange={e => handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="mt-1 text-[9px] text-immo-text-muted">Max 10MB par fichier. Images: JPG, PNG, WebP. Videos: MP4, WebM.</p>
    </div>
  )
}
