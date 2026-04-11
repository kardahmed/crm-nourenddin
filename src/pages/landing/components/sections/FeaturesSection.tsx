interface FeaturesContent {
  items?: Array<{ icon?: string; title: string; description?: string }>
}

const ICONS: Record<string, string> = {
  surface: '📐', parking: '🅿️', securite: '🔒', piscine: '🏊', jardin: '🌿',
  ascenseur: '🛗', etages: '🏢', livraison: '📅', vue: '🌅', terrasse: '☀️',
  cuisine: '👨‍🍳', climatisation: '❄️', chauffage: '🔥', wifi: '📶', default: '✓',
}

export function FeaturesSection({ title, content, accent }: { title?: string; content: FeaturesContent; accent: string }) {
  const items = content.items ?? []
  if (items.length === 0) return null

  return (
    <div className="py-12 px-4" style={{ background: `${accent}08` }}>
      <div className="mx-auto max-w-4xl">
        {title && <h2 className="mb-8 text-center text-2xl font-bold text-[#0A2540]">{title}</h2>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-[#E3E8EF] bg-white p-4 text-center">
              <span className="text-2xl">{ICONS[item.icon ?? 'default'] ?? ICONS.default}</span>
              <p className="mt-2 text-sm font-semibold text-[#0A2540]">{item.title}</p>
              {item.description && <p className="mt-1 text-xs text-[#8898AA]">{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
