import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface GalleryContent {
  images?: Array<{ url: string; caption?: string }>
  layout?: 'grid' | 'carousel'
}

export function GallerySection({ title, content }: { title?: string; content: GalleryContent }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const images = content.images ?? []
  if (images.length === 0) return null

  return (
    <div className="py-12 px-4">
      <div className="mx-auto max-w-5xl">
        {title && <h2 className="mb-8 text-center text-2xl font-bold text-[#0A2540]">{title}</h2>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <button key={i} onClick={() => setLightbox(i)} className="group relative aspect-[4/3] overflow-hidden rounded-xl">
              <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-xs text-white">{img.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 text-white/60 hover:text-white"><X className="h-6 w-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(Math.max(0, lightbox - 1)) }} className="absolute left-4 text-white/60 hover:text-white"><ChevronLeft className="h-8 w-8" /></button>
          <img src={images[lightbox].url} alt="" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); setLightbox(Math.min(images.length - 1, lightbox + 1)) }} className="absolute right-4 text-white/60 hover:text-white"><ChevronRight className="h-8 w-8" /></button>
          {images[lightbox].caption && <p className="absolute bottom-6 text-sm text-white/80">{images[lightbox].caption}</p>}
        </div>
      )}
    </div>
  )
}
