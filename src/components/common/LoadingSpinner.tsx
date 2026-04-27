interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Screen-reader announcement for the loading state. Defaults to "Loading…". */
  label?: string
}

const SIZES = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
} as const

export function LoadingSpinner({ size = 'md', className = '', label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`animate-spin rounded-full border-immo-accent-green border-t-transparent ${SIZES[size]}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
