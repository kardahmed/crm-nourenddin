import { formatPrice } from '@/lib/constants'

interface PricingContent {
  items?: Array<{ type: string; surface?: string; price: number; badge?: string }>
}

export function PricingSection({ title, content, accent }: { title?: string; content: PricingContent; accent: string }) {
  const items = content.items ?? []
  if (items.length === 0) return null

  return (
    <div className="py-12 px-4">
      <div className="mx-auto max-w-3xl">
        {title && <h2 className="mb-8 text-center text-2xl font-bold text-[#0A2540]">{title}</h2>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="relative rounded-xl border border-[#E3E8EF] bg-white p-6 text-center shadow-sm">
              {item.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: accent }}>
                  {item.badge}
                </span>
              )}
              <p className="text-lg font-bold text-[#0A2540]">{item.type}</p>
              {item.surface && <p className="mt-1 text-sm text-[#8898AA]">{item.surface}</p>}
              <p className="mt-3 text-2xl font-bold" style={{ color: accent }}>{formatPrice(item.price)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
