import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  level?: 'app' | 'section' | 'component'
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    // Call optional onError callback for external error reporting
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, level = 'section', fallbackTitle } = this.props

    if (!hasError) {
      return children
    }

    // App-level: Full screen error with reload option
    if (level === 'app') {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {fallbackTitle || 'Ha ocurrido un error'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Lo sentimos, algo ha salido mal. Por favor, recarga la aplicacion para continuar.
              </p>
              {error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {error.message}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recargar Aplicacion
                </Button>
                <Button variant="outline" onClick={this.handleReset} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Intentar de Nuevo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Section-level: Card with retry button
    if (level === 'section') {
      return (
        <Card className="m-4 border-destructive/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-base">
                {fallbackTitle || 'Error en esta seccion'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No se ha podido cargar esta seccion. Puedes intentar de nuevo o navegar a otra parte de la aplicacion.
            </p>
            {error && (
              <div className="rounded-md bg-muted p-2">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {error.message}
                </p>
              </div>
            )}
            <Button onClick={this.handleReset} size="sm">
              <RefreshCw className="mr-2 h-3 w-3" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )
    }

    // Component-level: Inline minimal error
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-destructive">
          {fallbackTitle || 'Error al cargar'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={this.handleReset}
          className="ml-auto h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    )
  }
}

export default ErrorBoundary
