interface CTAContent {
  text?: string
  button_label?: string
}

export function CTASection({ title, content, accent }: { title?: string; content: CTAContent; accent: string }) {
  function scrollToForm() {
    document.getElementById('landing-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="py-16 px-4" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}>
      <div className="mx-auto max-w-2xl text-center">
        {title && <h2 className="text-3xl font-bold text-white">{title}</h2>}
        {content.text && <p className="mt-3 text-lg text-white/80">{content.text}</p>}
        <button
          onClick={scrollToForm}
          className="mt-6 rounded-lg bg-white px-8 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-105"
          style={{ color: accent }}
        >
          {content.button_label ?? 'Contactez-nous'}
        </button>
      </div>
    </div>
  )
}
