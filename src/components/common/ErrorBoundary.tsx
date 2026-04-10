import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-screen items-center justify-center bg-immo-bg-primary p-8">
          <div className="max-w-md space-y-4 text-center">
            <div className="text-4xl">!</div>
            <h1 className="text-xl font-semibold text-immo-text-primary">
              Error / Une erreur est survenue / حدث خطأ
            </h1>
            <p className="text-sm text-immo-text-muted">
              {this.state.error?.message ?? 'Erreur inattendue'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/dashboard'
              }}
              className="rounded-lg bg-immo-accent-green px-4 py-2 text-sm font-medium text-white hover:bg-immo-accent-green/90"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
