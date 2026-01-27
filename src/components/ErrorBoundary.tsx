import { AlertTriangle, ChevronDown, ChevronUp, ClipboardCopy, Home, RefreshCw } from 'lucide-react';
import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const isDev = import.meta.env.DEV;

interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  reactVersion: string;
  consoleLogs: ConsoleLog[];
  networkErrors: NetworkError[];
}

interface ConsoleLog {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
}

interface NetworkError {
  url: string;
  status?: number;
  message: string;
  timestamp: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'section' | 'component';
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorDetails: ErrorDetails | null;
  showDetails: boolean;
  copied: boolean;
}

// Global console log capture for development
const capturedLogs: ConsoleLog[] = [];
const capturedNetworkErrors: NetworkError[] = [];
const MAX_LOGS = 50;

if (isDev && typeof window !== 'undefined') {
  // Capture console logs
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  const captureLog = (type: ConsoleLog['type'], args: unknown[]) => {
    const message = args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    capturedLogs.push({
      type,
      message: message.slice(0, 500), // Limit message size
      timestamp: new Date().toISOString(),
    });

    // Keep only last N logs
    if (capturedLogs.length > MAX_LOGS) {
      capturedLogs.shift();
    }
  };

  console.log = (...args) => {
    captureLog('log', args);
    originalConsole.log(...args);
  };
  console.warn = (...args) => {
    captureLog('warn', args);
    originalConsole.warn(...args);
  };
  console.error = (...args) => {
    captureLog('error', args);
    originalConsole.error(...args);
  };
  console.info = (...args) => {
    captureLog('info', args);
    originalConsole.info(...args);
  };

  // Capture failed network requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
    try {
      const response = await originalFetch(...args);
      if (!response.ok) {
        capturedNetworkErrors.push({
          url,
          status: response.status,
          message: `HTTP ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        });
        if (capturedNetworkErrors.length > MAX_LOGS) {
          capturedNetworkErrors.shift();
        }
      }
      return response;
    } catch (err) {
      capturedNetworkErrors.push({
        url,
        message: err instanceof Error ? err.message : 'Network error',
        timestamp: new Date().toISOString(),
      });
      if (capturedNetworkErrors.length > MAX_LOGS) {
        capturedNetworkErrors.shift();
      }
      throw err;
    }
  };
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      reactVersion: React.version,
      consoleLogs: [...capturedLogs].reverse(), // Most recent first
      networkErrors: [...capturedNetworkErrors].reverse(),
    };

    this.setState({ errorInfo, errorDetails });

    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      showDetails: false,
      copied: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  copyToClipboard = async (): Promise<void> => {
    const { errorDetails } = this.state;
    if (!errorDetails) return;

    const report = this.generateErrorReport();

    try {
      await navigator.clipboard.writeText(report);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  generateErrorReport = (): string => {
    const { errorDetails } = this.state;
    if (!errorDetails) return '';

    const sections = [
      '=== ERROR REPORT ===',
      '',
      `Timestamp: ${errorDetails.timestamp}`,
      `URL: ${errorDetails.url}`,
      `React Version: ${errorDetails.reactVersion}`,
      `User Agent: ${errorDetails.userAgent}`,
      '',
      '=== ERROR MESSAGE ===',
      errorDetails.message,
      '',
      '=== STACK TRACE ===',
      errorDetails.stack || 'No stack trace available',
      '',
      '=== COMPONENT STACK ===',
      errorDetails.componentStack || 'No component stack available',
    ];

    if (errorDetails.networkErrors.length > 0) {
      sections.push(
        '',
        '=== NETWORK ERRORS ===',
        ...errorDetails.networkErrors.map(
          (ne) => `[${ne.timestamp}] ${ne.url} - ${ne.message}${ne.status ? ` (${ne.status})` : ''}`
        )
      );
    }

    if (errorDetails.consoleLogs.length > 0) {
      sections.push(
        '',
        '=== RECENT CONSOLE LOGS ===',
        ...errorDetails.consoleLogs.map((log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
      );
    }

    return sections.join('\n');
  };

  renderTechnicalDetails(): ReactNode {
    const { errorDetails, showDetails, copied } = this.state;
    if (!isDev || !errorDetails) return null;

    return (
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={this.toggleDetails} className="flex-1">
            {showDetails ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {showDetails ? 'Ocultar Detalles' : 'Detalles Tecnicos'}
          </Button>
          <Button variant="outline" size="sm" onClick={this.copyToClipboard}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>

        {showDetails && (
          <div className="rounded-md bg-muted p-3 max-h-96 overflow-auto text-xs font-mono space-y-4">
            {/* Error Info */}
            <div>
              <div className="text-destructive font-bold mb-1">Error:</div>
              <div className="text-muted-foreground break-all">{errorDetails.message}</div>
            </div>

            {/* Stack Trace */}
            {errorDetails.stack && (
              <div>
                <div className="text-warning font-bold mb-1">Stack Trace:</div>
                <pre className="text-muted-foreground whitespace-pre-wrap break-all text-[10px]">
                  {errorDetails.stack}
                </pre>
              </div>
            )}

            {/* Component Stack */}
            {errorDetails.componentStack && (
              <div>
                <div className="text-chart-3 font-bold mb-1">Component Stack:</div>
                <pre className="text-muted-foreground whitespace-pre-wrap break-all text-[10px]">
                  {errorDetails.componentStack}
                </pre>
              </div>
            )}

            {/* Network Errors */}
            {errorDetails.networkErrors.length > 0 && (
              <div>
                <div className="text-chart-1 font-bold mb-1">Network Errors ({errorDetails.networkErrors.length}):</div>
                <div className="space-y-1">
                  {errorDetails.networkErrors.slice(0, 10).map((ne, i) => (
                    <div key={i} className="text-muted-foreground text-[10px]">
                      <span className="text-chart-1">[{ne.timestamp.split('T')[1]?.slice(0, 8)}]</span>{' '}
                      <span className="text-destructive">{ne.message}</span>
                      <div className="pl-4 opacity-70 break-all">{ne.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Console Logs */}
            {errorDetails.consoleLogs.length > 0 && (
              <div>
                <div className="text-chart-2 font-bold mb-1">Recent Logs ({errorDetails.consoleLogs.length}):</div>
                <div className="space-y-0.5">
                  {errorDetails.consoleLogs.slice(0, 20).map((log, i) => (
                    <div
                      key={i}
                      className={`text-[10px] ${
                        log.type === 'error'
                          ? 'text-destructive'
                          : log.type === 'warn'
                            ? 'text-warning'
                            : 'text-muted-foreground'
                      }`}
                    >
                      <span className="opacity-50">[{log.timestamp.split('T')[1]?.slice(0, 8)}]</span>{' '}
                      <span className="font-bold">[{log.type.toUpperCase()}]</span>{' '}
                      <span className="break-all">{log.message.slice(0, 200)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Environment Info */}
            <div className="pt-2 border-t border-border">
              <div className="text-muted-foreground text-[10px] space-y-0.5">
                <div>
                  <span className="font-bold">Timestamp:</span> {errorDetails.timestamp}
                </div>
                <div>
                  <span className="font-bold">React:</span> {errorDetails.reactVersion}
                </div>
                <div className="break-all">
                  <span className="font-bold">URL:</span> {errorDetails.url}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'section', fallbackTitle, fallbackMessage } = this.props;

    if (!hasError) {
      return children;
    }

    // If custom fallback is provided, use it
    if (fallback) {
      return fallback;
    }

    // Page-level: Full screen error with reload option
    if (level === 'page') {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">{fallbackTitle || 'Ha ocurrido un error'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                {fallbackMessage ||
                  'Lo sentimos, algo ha salido mal. Por favor, recarga la aplicacion para continuar.'}
              </p>
              {error && !isDev && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">{error.message}</p>
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
              {this.renderTechnicalDetails()}
            </CardContent>
          </Card>
        </div>
      );
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
              <CardTitle className="text-base">{fallbackTitle || 'Error en esta seccion'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {fallbackMessage ||
                'No se ha podido cargar esta seccion. Puedes intentar de nuevo o navegar a otra parte de la aplicacion.'}
            </p>
            {error && !isDev && (
              <div className="rounded-md bg-muted p-2">
                <p className="text-xs font-mono text-muted-foreground break-all">{error.message}</p>
              </div>
            )}
            <Button onClick={this.handleReset} size="sm">
              <RefreshCw className="mr-2 h-3 w-3" />
              Reintentar
            </Button>
            {this.renderTechnicalDetails()}
          </CardContent>
        </Card>
      );
    }

    // Component-level: Inline minimal error
    return (
      <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-destructive">{fallbackTitle || 'Error al cargar'}</span>
          <Button variant="ghost" size="sm" onClick={this.handleReset} className="ml-auto h-6 px-2 text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {isDev && this.renderTechnicalDetails()}
      </div>
    );
  }
}

export default ErrorBoundary;
