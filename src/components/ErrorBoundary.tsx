import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Home,
  RefreshCw,
} from 'lucide-solid';
import { createSignal, For, type JSX, Show, ErrorBoundary as SolidErrorBoundary } from 'solid-js';
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
  solidVersion: string;
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
  children: JSX.Element;
  fallback?: JSX.Element;
  level?: 'page' | 'section' | 'component';
  onError?: (error: Error, reset: () => void) => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
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
    const url =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof URL
          ? args[0].href
          : (args[0] as Request).url;
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

function generateErrorReport(errorDetails: ErrorDetails): string {
  const sections = [
    '=== ERROR REPORT ===',
    '',
    `Timestamp: ${errorDetails.timestamp}`,
    `URL: ${errorDetails.url}`,
    `SolidJS Version: ${errorDetails.solidVersion}`,
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
      ...errorDetails.consoleLogs.map(
        (log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
      )
    );
  }

  return sections.join('\n');
}

function TechnicalDetails(props: { errorDetails: ErrorDetails }) {
  const [showDetails, setShowDetails] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  const toggleDetails = () => {
    setShowDetails(!showDetails());
  };

  const copyToClipboard = async () => {
    const report = generateErrorReport(props.errorDetails);

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Show when={isDev}>
      <div class="mt-4 space-y-2">
        <div class="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleDetails} class="flex-1">
            <Show when={showDetails()} fallback={<ChevronDown class="mr-2 h-4 w-4" />}>
              <ChevronUp class="mr-2 h-4 w-4" />
            </Show>
            {showDetails() ? 'Ocultar Detalles' : 'Detalles Tecnicos'}
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <ClipboardCopy class="mr-2 h-4 w-4" />
            {copied() ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>

        <Show when={showDetails()}>
          <div class="rounded-md bg-muted p-3 max-h-96 overflow-auto text-xs font-mono space-y-4">
            {/* Error Info */}
            <div>
              <div class="text-destructive font-bold mb-1">Error:</div>
              <div class="text-muted-foreground break-all">{props.errorDetails.message}</div>
            </div>

            {/* Stack Trace */}
            <Show when={props.errorDetails.stack}>
              <div>
                <div class="text-warning font-bold mb-1">Stack Trace:</div>
                <pre class="text-muted-foreground whitespace-pre-wrap break-all text-[10px]">
                  {props.errorDetails.stack}
                </pre>
              </div>
            </Show>

            {/* Component Stack */}
            <Show when={props.errorDetails.componentStack}>
              <div>
                <div class="text-chart-3 font-bold mb-1">Component Stack:</div>
                <pre class="text-muted-foreground whitespace-pre-wrap break-all text-[10px]">
                  {props.errorDetails.componentStack}
                </pre>
              </div>
            </Show>

            {/* Network Errors */}
            <Show when={props.errorDetails.networkErrors.length > 0}>
              <div>
                <div class="text-chart-1 font-bold mb-1">
                  Network Errors ({props.errorDetails.networkErrors.length}):
                </div>
                <div class="space-y-1">
                  <For each={props.errorDetails.networkErrors.slice(0, 10)}>
                    {(ne) => (
                      <div class="text-muted-foreground text-[10px]">
                        <span class="text-chart-1">
                          [{ne.timestamp.split('T')[1]?.slice(0, 8)}]
                        </span>{' '}
                        <span class="text-destructive">{ne.message}</span>
                        <div class="pl-4 opacity-70 break-all">{ne.url}</div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Console Logs */}
            <Show when={props.errorDetails.consoleLogs.length > 0}>
              <div>
                <div class="text-chart-2 font-bold mb-1">
                  Recent Logs ({props.errorDetails.consoleLogs.length}):
                </div>
                <div class="space-y-0.5">
                  <For each={props.errorDetails.consoleLogs.slice(0, 20)}>
                    {(log) => (
                      <div
                        class={`text-[10px] ${
                          log.type === 'error'
                            ? 'text-destructive'
                            : log.type === 'warn'
                              ? 'text-warning'
                              : 'text-muted-foreground'
                        }`}
                      >
                        <span class="opacity-50">[{log.timestamp.split('T')[1]?.slice(0, 8)}]</span>{' '}
                        <span class="font-bold">[{log.type.toUpperCase()}]</span>{' '}
                        <span class="break-all">{log.message.slice(0, 200)}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Environment Info */}
            <div class="pt-2 border-t border-border">
              <div class="text-muted-foreground text-[10px] space-y-0.5">
                <div>
                  <span class="font-bold">Timestamp:</span> {props.errorDetails.timestamp}
                </div>
                <div>
                  <span class="font-bold">SolidJS:</span> {props.errorDetails.solidVersion}
                </div>
                <div class="break-all">
                  <span class="font-bold">URL:</span> {props.errorDetails.url}
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}

function ErrorFallback(props: {
  error: Error;
  reset: () => void;
  level: 'page' | 'section' | 'component';
  fallbackTitle?: string;
  fallbackMessage?: string;
}) {
  const errorDetails: ErrorDetails = {
    message: props.error.message,
    stack: props.error.stack,
    componentStack: undefined,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    solidVersion: '1.x', // SolidJS doesn't expose version like React does
    consoleLogs: [...capturedLogs].reverse(), // Most recent first
    networkErrors: [...capturedNetworkErrors].reverse(),
  };

  // Log error for debugging
  console.error('[ErrorBoundary] Caught error:', {
    error: props.error.message,
    stack: props.error.stack,
  });

  const handleReload = () => {
    window.location.reload();
  };

  // Page-level: Full screen error with reload option
  if (props.level === 'page') {
    return (
      <div class="fixed inset-0 flex items-center justify-center bg-background p-4">
        <Card class="w-full max-w-lg shadow-xl">
          <CardHeader class="text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle class="h-8 w-8 text-destructive" />
            </div>
            <CardTitle class="text-xl">{props.fallbackTitle || 'Ha ocurrido un error'}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <p class="text-center text-muted-foreground">
              {props.fallbackMessage ||
                'Lo sentimos, algo ha salido mal. Por favor, recarga la aplicacion para continuar.'}
            </p>
            <Show when={props.error && !isDev}>
              <div class="rounded-md bg-muted p-3">
                <p class="text-xs font-mono text-muted-foreground break-all">
                  {props.error.message}
                </p>
              </div>
            </Show>
            <div class="flex flex-col gap-2">
              <Button onClick={handleReload} class="w-full">
                <RefreshCw class="mr-2 h-4 w-4" />
                Recargar Aplicacion
              </Button>
              <Button variant="outline" onClick={props.reset} class="w-full">
                <Home class="mr-2 h-4 w-4" />
                Intentar de Nuevo
              </Button>
            </div>
            <TechnicalDetails errorDetails={errorDetails} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Section-level: Card with retry button
  if (props.level === 'section') {
    return (
      <Card class="m-4 border-destructive/50">
        <CardHeader class="pb-3">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle class="h-5 w-5 text-destructive" />
            </div>
            <CardTitle class="text-base">
              {props.fallbackTitle || 'Error en esta seccion'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm text-muted-foreground">
            {props.fallbackMessage ||
              'No se ha podido cargar esta seccion. Puedes intentar de nuevo o navegar a otra parte de la aplicacion.'}
          </p>
          <Show when={props.error && !isDev}>
            <div class="rounded-md bg-muted p-2">
              <p class="text-xs font-mono text-muted-foreground break-all">{props.error.message}</p>
            </div>
          </Show>
          <Button onClick={props.reset} size="sm">
            <RefreshCw class="mr-2 h-3 w-3" />
            Reintentar
          </Button>
          <TechnicalDetails errorDetails={errorDetails} />
        </CardContent>
      </Card>
    );
  }

  // Component-level: Inline minimal error
  return (
    <div class="rounded-md bg-destructive/10 px-3 py-2 text-sm">
      <div class="flex items-center gap-2">
        <AlertTriangle class="h-4 w-4 text-destructive flex-shrink-0" />
        <span class="text-destructive">{props.fallbackTitle || 'Error al cargar'}</span>
        <Button variant="ghost" size="sm" onClick={props.reset} class="ml-auto h-6 px-2 text-xs">
          <RefreshCw class="h-3 w-3" />
        </Button>
      </div>
      <Show when={isDev}>
        <TechnicalDetails errorDetails={errorDetails} />
      </Show>
    </div>
  );
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const level = props.level || 'section';

  // If custom fallback is provided, use it
  if (props.fallback) {
    return <SolidErrorBoundary fallback={props.fallback}>{props.children}</SolidErrorBoundary>;
  }

  return (
    <SolidErrorBoundary
      fallback={(err, reset) => {
        const error = err instanceof Error ? err : new Error(String(err));

        // Call optional onError callback
        if (props.onError) {
          props.onError(error, reset);
        }

        return (
          <ErrorFallback
            error={error}
            reset={reset}
            level={level}
            fallbackTitle={props.fallbackTitle}
            fallbackMessage={props.fallbackMessage}
          />
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

export default ErrorBoundary;
