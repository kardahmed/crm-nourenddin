interface VideoContent {
  url?: string
  caption?: string
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  // Direct URL or other
  return url
}

export function VideoSection({ title, content }: { title?: string; content: VideoContent }) {
  if (!content.url) return null

  return (
    <div className="py-12 px-4">
      <div className="mx-auto max-w-3xl">
        {title && <h2 className="mb-6 text-center text-2xl font-bold text-[#0A2540]">{title}</h2>}
        <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={getEmbedUrl(content.url)}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title ?? 'Video'}
          />
        </div>
        {content.caption && <p className="mt-3 text-center text-sm text-[#8898AA]">{content.caption}</p>}
      </div>
    </div>
  )
}
