interface VirtualTourContent {
  embed_url?: string
  caption?: string
}

export function VirtualTourSection({ title, content }: { title?: string; content: VirtualTourContent }) {
  if (!content.embed_url) return null

  return (
    <div className="py-12 px-4">
      <div className="mx-auto max-w-4xl">
        {title && <h2 className="mb-6 text-center text-2xl font-bold text-[#0A2540]">{title}</h2>}
        <div className="relative overflow-hidden rounded-2xl border border-[#E3E8EF] shadow-lg" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={content.embed_url}
            className="absolute inset-0 h-full w-full"
            allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
            allowFullScreen
            title={title ?? 'Visite virtuelle'}
          />
        </div>
        {content.caption && <p className="mt-3 text-center text-sm text-[#8898AA]">{content.caption}</p>}
      </div>
    </div>
  )
}
