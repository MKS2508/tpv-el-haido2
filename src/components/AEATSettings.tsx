/**
 * AEATSettings Component
 *
 * Panel de configuracion para la integracion AEAT VERI*FACTU.
 * Permite configurar el modo de conexion, entorno y gestionar el sidecar.
 */

import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  Cloud,
  ExternalLink,
  FileText,
  Key,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Square,
  Wifi,
  WifiOff,
  X,
} from 'lucide-solid';
import { createSignal, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { useAEAT } from '@/hooks/useAEAT';
import type { AEATEnvironment, AEATMode } from '@/models/AEAT';

// ==================== Types ====================

interface AEATSettingsProps {
  class?: string;
}

// ==================== Component ====================

export default function AEATSettings(props: AEATSettingsProps) {
  const {
    config,
    connectionStatus,
    sidecarState,
    isLoading,
    updateConfig,
    testConnection,
    startSidecar,
    stopSidecar,
    restartSidecar,
    isSidecarAvailable,
    isEnabled,
    isConnected,
  } = useAEAT({
    onConnectionChange: (status) => {
      if (status.isConnected) {
        toast({
          title: 'AEAT Conectado',
          description: 'Conexión establecida con el servicio VERI*FACTU',
          duration: 3000,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error AEAT',
        description: error,
        duration: 5000,
      });
    },
  });

  const [externalUrl, setExternalUrl] = createSignal(config().externalUrl || 'http://localhost:3001');

  // ==================== Handlers ====================

  const handleModeChange = (mode: AEATMode) => {
    updateConfig({ mode });

    if (mode === 'external') {
      updateConfig({ externalUrl: externalUrl() });
    }

    toast({
      title: 'Modo cambiado',
      description: getModeDescription(mode),
      duration: 3000,
    });
  };

  const handleEnvironmentChange = (environment: AEATEnvironment) => {
    updateConfig({ environment });
    toast({
      title: 'Entorno cambiado',
      description:
        environment === 'test' ? 'Usando entorno de pruebas' : 'Usando entorno de producción',
      duration: 3000,
    });
  };

  const handleExternalUrlChange = (url: string) => {
    setExternalUrl(url);
  };

  const handleExternalUrlSave = () => {
    updateConfig({ externalUrl: externalUrl() });
    toast({
      title: 'URL guardada',
      description: `Servidor externo: ${externalUrl()}`,
      duration: 3000,
    });
  };

  const handleTestConnection = async () => {
    const result = await testConnection();
    if (result.ok && result.value.isConnected) {
      toast({
        title: 'Conexión exitosa',
        description: 'El servicio AEAT está disponible',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Conexión fallida',
        description: result.ok ? 'No se pudo conectar al servicio' : result.error.message,
        duration: 5000,
      });
    }
  };

  const handleStartSidecar = async () => {
    await startSidecar();
  };

  const handleStopSidecar = async () => {
    await stopSidecar();
  };

  const handleRestartSidecar = async () => {
    await restartSidecar();
  };

  // ==================== Helpers ====================

  const getModeDescription = (mode: AEATMode): string => {
    switch (mode) {
      case 'disabled':
        return 'Facturación AEAT deshabilitada';
      case 'external':
        return 'Conectando a servidor externo';
      case 'sidecar':
        return 'Servicio integrado en la aplicación';
      default:
        return '';
    }
  };

  const getStatusColor = (): string => {
    if (!isEnabled()) return 'bg-gray-400';
    if (isConnected()) return 'bg-green-500';
    if (connectionStatus().error) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (): string => {
    if (!isEnabled()) return 'Deshabilitado';
    if (isLoading()) return 'Verificando...';
    if (isConnected()) return 'Conectado';
    if (connectionStatus().error) return 'Error';
    return 'Desconectado';
  };

  const getSidecarStatusColor = (): string => {
    switch (sidecarState().status) {
      case 'running':
        return 'text-green-500';
      case 'starting':
      case 'stopping':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getSidecarStatusText = (): string => {
    switch (sidecarState().status) {
      case 'running':
        return 'En ejecución';
      case 'starting':
        return 'Iniciando...';
      case 'stopping':
        return 'Deteniendo...';
      case 'error':
        return sidecarState().error || 'Error';
      default:
        return 'Detenido';
    }
  };

  // ==================== Render ====================

  return (
    <div class={`space-y-6 ${props.class || ''}`}>
      {/* Estado de Conexion */}
      <Card>
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-lg flex items-center gap-2">
                <FileText class="h-5 w-5" />
                VERI*FACTU
              </CardTitle>
              <CardDescription>Sistema de facturación electrónica AEAT</CardDescription>
            </div>
            <div class="flex items-center gap-2">
              <div class={`h-3 w-3 rounded-full ${getStatusColor()}`} />
              <span class="text-sm text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Selector de Modo */}
          <div class="space-y-2">
            <Label>Modo de Conexion</Label>
            <Select
              value={config().mode}
              onChange={(v: string | null) => v && handleModeChange(v as AEATMode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">
                  <span class="flex items-center gap-2">
                    <X class="h-4 w-4" />
                    Deshabilitado
                  </span>
                </SelectItem>
                <SelectItem value="external">
                  <span class="flex items-center gap-2">
                    <Cloud class="h-4 w-4" />
                    Servidor Externo
                  </span>
                </SelectItem>
                <Show when={isSidecarAvailable}>
                  <SelectItem value="sidecar">
                    <span class="flex items-center gap-2">
                      <Server class="h-4 w-4" />
                      Integrado (Sidecar)
                    </span>
                  </SelectItem>
                </Show>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              <Show when={config().mode === 'disabled'}>Las facturas no se enviaran a AEAT</Show>
              <Show when={config().mode === 'external'}>
                Conecta a un servidor AEAT Bridge ejecutandose externamente
              </Show>
              <Show when={config().mode === 'sidecar'}>
                El servicio se ejecuta integrado con la aplicacion
              </Show>
            </p>
          </div>

          {/* Selector de Entorno */}
          <Show when={isEnabled()}>
            <div class="space-y-2">
              <Label>Entorno</Label>
              <Select
                value={config().environment}
                onChange={(v: string | null) => v && handleEnvironmentChange(v as AEATEnvironment)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona entorno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">
                    <span class="flex items-center gap-2">
                      <AlertCircle class="h-4 w-4 text-yellow-500" />
                      Pruebas (Pre-produccion)
                    </span>
                  </SelectItem>
                  <SelectItem value="production">
                    <span class="flex items-center gap-2">
                      <Check class="h-4 w-4 text-green-500" />
                      Produccion
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">
                <Show when={config().environment === 'test'}>
                  Los datos enviados NO tienen trascendencia tributaria
                </Show>
                <Show when={config().environment !== 'test'}>
                  Los datos enviados SI tienen trascendencia tributaria
                </Show>
              </p>
            </div>
          </Show>
        </CardContent>
      </Card>

      {/* Configuracion Modo Externo */}
      <Show when={config().mode === 'external'}>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base flex items-center gap-2">
              <Cloud class="h-4 w-4" />
              Servidor Externo
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="externalUrl">URL del Servidor</Label>
              <div class="flex gap-2">
                <Input
                  id="externalUrl"
                  value={externalUrl()}
                  onInput={(e) => handleExternalUrlChange(e.currentTarget.value)}
                  placeholder="http://localhost:3001"
                  class="flex-1"
                />
                <Button variant="outline" onClick={handleExternalUrlSave}>
                  Guardar
                </Button>
              </div>
              <p class="text-xs text-muted-foreground">
                URL del servidor tpv-soap-aeat (ej: http://192.168.1.100:3001)
              </p>
            </div>

            <Button onClick={handleTestConnection} disabled={isLoading()} class="w-full">
              <Show when={isLoading()}>
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              </Show>
              <Show when={!isLoading() && isConnected()}>
                <Wifi class="mr-2 h-4 w-4" />
              </Show>
              <Show when={!isLoading() && !isConnected()}>
                <WifiOff class="mr-2 h-4 w-4" />
              </Show>
              Probar Conexion
            </Button>

            <Show when={connectionStatus().lastCheck}>
              <p class="text-xs text-muted-foreground text-center">
                Ultima verificacion: {connectionStatus().lastCheck?.toLocaleTimeString()}
              </p>
            </Show>
          </CardContent>
        </Card>
      </Show>

      {/* Configuracion Modo Sidecar */}
      <Show when={config().mode === 'sidecar' && isSidecarAvailable}>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base flex items-center gap-2">
              <Server class="h-4 w-4" />
              Servicio Integrado
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {/* Estado del Sidecar */}
            <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div class="flex items-center gap-2">
                <div
                  class={`h-2 w-2 rounded-full ${getSidecarStatusColor().replace('text-', 'bg-')}`}
                />
                <span class="text-sm font-medium">{getSidecarStatusText()}</span>
              </div>
              <Show when={sidecarState().pid}>
                <span class="text-xs text-muted-foreground">PID: {sidecarState().pid}</span>
              </Show>
            </div>

            {/* Controles del Sidecar */}
            <div class="flex gap-2">
              <Button
                variant="outline"
                onClick={handleStartSidecar}
                disabled={sidecarState().status === 'running' || sidecarState().status === 'starting'}
                class="flex-1"
              >
                <Play class="mr-2 h-4 w-4" />
                Iniciar
              </Button>
              <Button
                variant="outline"
                onClick={handleStopSidecar}
                disabled={sidecarState().status === 'stopped' || sidecarState().status === 'stopping'}
                class="flex-1"
              >
                <Square class="mr-2 h-4 w-4" />
                Detener
              </Button>
              <Button
                variant="outline"
                onClick={handleRestartSidecar}
                disabled={sidecarState().status === 'stopped'}
              >
                <RefreshCw class="mr-2 h-4 w-4" />
              </Button>
            </div>

            {/* Configuracion Puerto */}
            <div class="space-y-2">
              <Label for="sidecarPort">Puerto</Label>
              <Input
                id="sidecarPort"
                type="number"
                value={config().sidecarPort}
                onInput={(e) =>
                  updateConfig({ sidecarPort: parseInt(e.currentTarget.value, 10) || 3001 })
                }
                placeholder="3001"
                disabled={sidecarState().status === 'running'}
              />
              <p class="text-xs text-muted-foreground">
                Puerto en el que se ejecuta el servicio (reiniciar si se cambia)
              </p>
            </div>

            {/* Opciones */}
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label for="autoStartSidecar">Inicio automatico</Label>
                  <p class="text-xs text-muted-foreground">
                    Iniciar el servicio al abrir la aplicacion
                  </p>
                </div>
                <Switch
                  id="autoStartSidecar"
                  checked={config().autoStartSidecar}
                  onChange={(checked: boolean) => updateConfig({ autoStartSidecar: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Show>

      {/* Datos Fiscales del Negocio */}
      <Show when={isEnabled()}>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base flex items-center gap-2">
              <Building2 class="h-4 w-4" />
              Datos Fiscales
            </CardTitle>
            <CardDescription>Datos del obligado tributario para las facturas</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            {/* Aviso si faltan datos obligatorios */}
            <Show when={!config().businessData.nif || !config().businessData.nombreRazon}>
              <div class="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle class="h-4 w-4 text-yellow-500 mt-0.5" />
                <div class="text-sm">
                  <p class="font-medium text-yellow-600">Configuracion incompleta</p>
                  <p class="text-muted-foreground">
                    El NIF y Razon Social son obligatorios para enviar facturas a AEAT
                  </p>
                </div>
              </div>
            </Show>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="nif">NIF/CIF *</Label>
                <Input
                  id="nif"
                  value={config().businessData.nif}
                  onInput={(e) =>
                    updateConfig({
                      businessData: {
                        ...config().businessData,
                        nif: e.currentTarget.value.toUpperCase(),
                      },
                    })
                  }
                  placeholder="B12345678"
                  maxLength={9}
                />
                <p class="text-xs text-muted-foreground">NIF o CIF de la empresa</p>
              </div>

              <div class="space-y-2">
                <Label for="nombreRazon">Razon Social *</Label>
                <Input
                  id="nombreRazon"
                  value={config().businessData.nombreRazon}
                  onInput={(e) =>
                    updateConfig({
                      businessData: { ...config().businessData, nombreRazon: e.currentTarget.value },
                    })
                  }
                  placeholder="Mi Empresa S.L."
                />
                <p class="text-xs text-muted-foreground">Nombre o razon social de la empresa</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="serieFactura">Serie de Factura</Label>
                <Input
                  id="serieFactura"
                  value={config().businessData.serieFactura}
                  onInput={(e) =>
                    updateConfig({
                      businessData: {
                        ...config().businessData,
                        serieFactura: e.currentTarget.value,
                      },
                    })
                  }
                  placeholder="TPV-"
                />
                <p class="text-xs text-muted-foreground">
                  Prefijo para numero de factura (ej: TPV-2024-001)
                </p>
              </div>

              <div class="space-y-2">
                <Label for="tipoFactura">Tipo de Factura</Label>
                <Select
                  value={config().businessData.tipoFactura}
                  onChange={(v: string | null) =>
                    v &&
                    updateConfig({
                      businessData: { ...config().businessData, tipoFactura: v as 'F1' | 'F2' },
                    })
                  }
                >
                  <SelectTrigger id="tipoFactura">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F1">F1 - Factura completa</SelectItem>
                    <SelectItem value="F2">F2 - Factura simplificada (ticket)</SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-xs text-muted-foreground">
                  F2 para tickets, F1 para facturas con datos del cliente
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <Label for="descripcionOperacion">Descripcion de Operaciones</Label>
              <Input
                id="descripcionOperacion"
                value={config().businessData.descripcionOperacion}
                onInput={(e) =>
                  updateConfig({
                    businessData: {
                      ...config().businessData,
                      descripcionOperacion: e.currentTarget.value,
                    },
                  })
                }
                placeholder="Venta TPV"
              />
              <p class="text-xs text-muted-foreground">Descripcion por defecto en las facturas</p>
            </div>
          </CardContent>
        </Card>
      </Show>

      {/* Opciones de Facturacion */}
      <Show when={isEnabled()}>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Opciones de Facturacion</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label for="autoSendInvoices">Envio automatico</Label>
                <p class="text-xs text-muted-foreground">
                  Enviar facturas a AEAT al completar cada pedido
                </p>
              </div>
              <Switch
                id="autoSendInvoices"
                checked={config().autoSendInvoices}
                onChange={(checked: boolean) => updateConfig({ autoSendInvoices: checked })}
                disabled={!config().businessData.nif || !config().businessData.nombreRazon}
              />
            </div>
            <Show
              when={
                config().autoSendInvoices &&
                (!config().businessData.nif || !config().businessData.nombreRazon)
              }
            >
              <p class="text-xs text-yellow-600">
                Complete los datos fiscales para activar el envio automatico
              </p>
            </Show>

            <div class="space-y-2">
              <Label for="requestTimeout">Timeout (ms)</Label>
              <Input
                id="requestTimeout"
                type="number"
                value={config().requestTimeout}
                onInput={(e) =>
                  updateConfig({ requestTimeout: parseInt(e.currentTarget.value, 10) || 30000 })
                }
                placeholder="30000"
              />
              <p class="text-xs text-muted-foreground">
                Tiempo maximo de espera para respuestas de AEAT
              </p>
            </div>
          </CardContent>
        </Card>
      </Show>

      {/* Informacion de Certificados */}
      <Show when={isEnabled()}>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base flex items-center gap-2">
              <Key class="h-4 w-4" />
              Certificados Digitales
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="p-3 bg-muted/50 rounded-lg space-y-2">
              <p class="text-sm">
                Los certificados digitales se configuran en el servidor AEAT Bridge.
              </p>
              <p class="text-xs text-muted-foreground">
                Para {config().mode === 'external' ? 'el servidor externo' : 'el sidecar'}, configure
                las variables de entorno <code class="bg-muted px-1 rounded">PFX_PATH</code> y{' '}
                <code class="bg-muted px-1 rounded">PFX_PASSWORD</code> en el archivo{' '}
                <code class="bg-muted px-1 rounded">.env</code>
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <a
                href="https://www.sede.fnmt.gob.es/certificados"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink class="h-3 w-3" />
                Obtener certificado FNMT
              </a>
              <a
                href="https://www.agenciatributaria.es/AEAT.desarrolladores"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink class="h-3 w-3" />
                Portal desarrolladores AEAT
              </a>
            </div>

            <div class="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <p>
                <strong>Entorno actual:</strong>{' '}
                {config().environment === 'test'
                  ? 'Pruebas (prewww1.aeat.es)'
                  : 'Produccion (www1.agenciatributaria.gob.es)'}
              </p>
              <p>
                <strong>Tipo recomendado:</strong> Certificado de sello para TPV automatizado
              </p>
            </div>
          </CardContent>
        </Card>
      </Show>

      {/* Informacion del Circuit Breaker */}
      <Show when={isEnabled() && connectionStatus().circuitBreaker}>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Circuit Breaker:</span>
                <span
                  class={`ml-2 font-medium ${
                    connectionStatus().circuitBreaker?.state === 'CLOSED'
                      ? 'text-green-500'
                      : connectionStatus().circuitBreaker?.state === 'OPEN'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}
                >
                  {connectionStatus().circuitBreaker?.state}
                </span>
              </div>
              <div>
                <span class="text-muted-foreground">Fallos:</span>
                <span class="ml-2 font-medium">{connectionStatus().circuitBreaker?.failures}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Exitos:</span>
                <span class="ml-2 font-medium">{connectionStatus().circuitBreaker?.successes}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Endpoint:</span>
                <span class="ml-2 font-medium text-xs truncate">
                  {connectionStatus().endpoint.substring(0, 30)}...
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Show>
    </div>
  );
}
