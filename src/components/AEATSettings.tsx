/**
 * AEATSettings Component
 *
 * Panel de configuración para la integración AEAT VERI*FACTU.
 * Permite configurar el modo de conexión, entorno y gestionar el sidecar.
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
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
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
  className?: string;
}

// ==================== Component ====================

const AEATSettings: React.FC<AEATSettingsProps> = ({ className }) => {
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

  const [externalUrl, setExternalUrl] = useState(config.externalUrl || 'http://localhost:3001');

  // ==================== Handlers ====================

  const handleModeChange = (mode: AEATMode) => {
    updateConfig({ mode });

    if (mode === 'external') {
      updateConfig({ externalUrl });
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
    updateConfig({ externalUrl });
    toast({
      title: 'URL guardada',
      description: `Servidor externo: ${externalUrl}`,
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
    if (!isEnabled) return 'bg-gray-400';
    if (isConnected) return 'bg-green-500';
    if (connectionStatus.error) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (): string => {
    if (!isEnabled) return 'Deshabilitado';
    if (isLoading) return 'Verificando...';
    if (isConnected) return 'Conectado';
    if (connectionStatus.error) return 'Error';
    return 'Desconectado';
  };

  const getSidecarStatusColor = (): string => {
    switch (sidecarState.status) {
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
    switch (sidecarState.status) {
      case 'running':
        return 'En ejecución';
      case 'starting':
        return 'Iniciando...';
      case 'stopping':
        return 'Deteniendo...';
      case 'error':
        return sidecarState.error || 'Error';
      default:
        return 'Detenido';
    }
  };

  // ==================== Render ====================

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Estado de Conexión */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                VERI*FACTU
              </CardTitle>
              <CardDescription>Sistema de facturación electrónica AEAT</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
              <span className="text-sm text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Modo */}
          <div className="space-y-2">
            <Label>Modo de Conexión</Label>
            <Select value={config.mode} onValueChange={(v) => handleModeChange(v as AEATMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">
                  <span className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Deshabilitado
                  </span>
                </SelectItem>
                <SelectItem value="external">
                  <span className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Servidor Externo
                  </span>
                </SelectItem>
                {isSidecarAvailable && (
                  <SelectItem value="sidecar">
                    <span className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Integrado (Sidecar)
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.mode === 'disabled' && 'Las facturas no se enviarán a AEAT'}
              {config.mode === 'external' &&
                'Conecta a un servidor AEAT Bridge ejecutándose externamente'}
              {config.mode === 'sidecar' && 'El servicio se ejecuta integrado con la aplicación'}
            </p>
          </div>

          {/* Selector de Entorno */}
          {isEnabled && (
            <div className="space-y-2">
              <Label>Entorno</Label>
              <Select
                value={config.environment}
                onValueChange={(v) => handleEnvironmentChange(v as AEATEnvironment)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona entorno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Pruebas (Pre-producción)
                    </span>
                  </SelectItem>
                  <SelectItem value="production">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Producción
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {config.environment === 'test'
                  ? 'Los datos enviados NO tienen trascendencia tributaria'
                  : 'Los datos enviados SÍ tienen trascendencia tributaria'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración Modo Externo */}
      {config.mode === 'external' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Servidor Externo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="externalUrl">URL del Servidor</Label>
              <div className="flex gap-2">
                <Input
                  id="externalUrl"
                  value={externalUrl}
                  onChange={(e) => handleExternalUrlChange(e.target.value)}
                  placeholder="http://localhost:3001"
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleExternalUrlSave}>
                  Guardar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                URL del servidor tpv-soap-aeat (ej: http://192.168.1.100:3001)
              </p>
            </div>

            <Button onClick={handleTestConnection} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <Wifi className="mr-2 h-4 w-4" />
              ) : (
                <WifiOff className="mr-2 h-4 w-4" />
              )}
              Probar Conexión
            </Button>

            {connectionStatus.lastCheck && (
              <p className="text-xs text-muted-foreground text-center">
                Última verificación: {connectionStatus.lastCheck.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuración Modo Sidecar */}
      {config.mode === 'sidecar' && isSidecarAvailable && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Servicio Integrado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado del Sidecar */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${getSidecarStatusColor().replace('text-', 'bg-')}`}
                />
                <span className="text-sm font-medium">{getSidecarStatusText()}</span>
              </div>
              {sidecarState.pid && (
                <span className="text-xs text-muted-foreground">PID: {sidecarState.pid}</span>
              )}
            </div>

            {/* Controles del Sidecar */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleStartSidecar}
                disabled={sidecarState.status === 'running' || sidecarState.status === 'starting'}
                className="flex-1"
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar
              </Button>
              <Button
                variant="outline"
                onClick={handleStopSidecar}
                disabled={sidecarState.status === 'stopped' || sidecarState.status === 'stopping'}
                className="flex-1"
              >
                <Square className="mr-2 h-4 w-4" />
                Detener
              </Button>
              <Button
                variant="outline"
                onClick={handleRestartSidecar}
                disabled={sidecarState.status === 'stopped'}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
              </Button>
            </div>

            {/* Configuración Puerto */}
            <div className="space-y-2">
              <Label htmlFor="sidecarPort">Puerto</Label>
              <Input
                id="sidecarPort"
                type="number"
                value={config.sidecarPort}
                onChange={(e) =>
                  updateConfig({ sidecarPort: parseInt(e.target.value, 10) || 3001 })
                }
                placeholder="3001"
                disabled={sidecarState.status === 'running'}
              />
              <p className="text-xs text-muted-foreground">
                Puerto en el que se ejecuta el servicio (reiniciar si se cambia)
              </p>
            </div>

            {/* Opciones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoStartSidecar">Inicio automático</Label>
                  <p className="text-xs text-muted-foreground">
                    Iniciar el servicio al abrir la aplicación
                  </p>
                </div>
                <Switch
                  id="autoStartSidecar"
                  checked={config.autoStartSidecar}
                  onCheckedChange={(checked) => updateConfig({ autoStartSidecar: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datos Fiscales del Negocio */}
      {isEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Datos Fiscales
            </CardTitle>
            <CardDescription>Datos del obligado tributario para las facturas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Aviso si faltan datos obligatorios */}
            {(!config.businessData.nif || !config.businessData.nombreRazon) && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-600">Configuración incompleta</p>
                  <p className="text-muted-foreground">
                    El NIF y Razón Social son obligatorios para enviar facturas a AEAT
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF/CIF *</Label>
                <Input
                  id="nif"
                  value={config.businessData.nif}
                  onChange={(e) =>
                    updateConfig({
                      businessData: { ...config.businessData, nif: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="B12345678"
                  maxLength={9}
                />
                <p className="text-xs text-muted-foreground">NIF o CIF de la empresa</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombreRazon">Razón Social *</Label>
                <Input
                  id="nombreRazon"
                  value={config.businessData.nombreRazon}
                  onChange={(e) =>
                    updateConfig({
                      businessData: { ...config.businessData, nombreRazon: e.target.value },
                    })
                  }
                  placeholder="Mi Empresa S.L."
                />
                <p className="text-xs text-muted-foreground">Nombre o razón social de la empresa</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serieFactura">Serie de Factura</Label>
                <Input
                  id="serieFactura"
                  value={config.businessData.serieFactura}
                  onChange={(e) =>
                    updateConfig({
                      businessData: { ...config.businessData, serieFactura: e.target.value },
                    })
                  }
                  placeholder="TPV-"
                />
                <p className="text-xs text-muted-foreground">
                  Prefijo para número de factura (ej: TPV-2024-001)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoFactura">Tipo de Factura</Label>
                <Select
                  value={config.businessData.tipoFactura}
                  onValueChange={(v) =>
                    updateConfig({
                      businessData: { ...config.businessData, tipoFactura: v as 'F1' | 'F2' },
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
                <p className="text-xs text-muted-foreground">
                  F2 para tickets, F1 para facturas con datos del cliente
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcionOperacion">Descripción de Operaciones</Label>
              <Input
                id="descripcionOperacion"
                value={config.businessData.descripcionOperacion}
                onChange={(e) =>
                  updateConfig({
                    businessData: { ...config.businessData, descripcionOperacion: e.target.value },
                  })
                }
                placeholder="Venta TPV"
              />
              <p className="text-xs text-muted-foreground">
                Descripción por defecto en las facturas
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opciones de Facturación */}
      {isEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Opciones de Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSendInvoices">Envío automático</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar facturas a AEAT al completar cada pedido
                </p>
              </div>
              <Switch
                id="autoSendInvoices"
                checked={config.autoSendInvoices}
                onCheckedChange={(checked) => updateConfig({ autoSendInvoices: checked })}
                disabled={!config.businessData.nif || !config.businessData.nombreRazon}
              />
            </div>
            {config.autoSendInvoices &&
              (!config.businessData.nif || !config.businessData.nombreRazon) && (
                <p className="text-xs text-yellow-600">
                  Complete los datos fiscales para activar el envío automático
                </p>
              )}

            <div className="space-y-2">
              <Label htmlFor="requestTimeout">Timeout (ms)</Label>
              <Input
                id="requestTimeout"
                type="number"
                value={config.requestTimeout}
                onChange={(e) =>
                  updateConfig({ requestTimeout: parseInt(e.target.value, 10) || 30000 })
                }
                placeholder="30000"
              />
              <p className="text-xs text-muted-foreground">
                Tiempo máximo de espera para respuestas de AEAT
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de Certificados */}
      {isEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              Certificados Digitales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm">
                Los certificados digitales se configuran en el servidor AEAT Bridge.
              </p>
              <p className="text-xs text-muted-foreground">
                Para {config.mode === 'external' ? 'el servidor externo' : 'el sidecar'}, configure
                las variables de entorno <code className="bg-muted px-1 rounded">PFX_PATH</code> y{' '}
                <code className="bg-muted px-1 rounded">PFX_PASSWORD</code> en el archivo{' '}
                <code className="bg-muted px-1 rounded">.env</code>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href="https://www.sede.fnmt.gob.es/certificados"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Obtener certificado FNMT
              </a>
              <a
                href="https://www.agenciatributaria.es/AEAT.desarrolladores"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Portal desarrolladores AEAT
              </a>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <p>
                <strong>Entorno actual:</strong>{' '}
                {config.environment === 'test'
                  ? 'Pruebas (prewww1.aeat.es)'
                  : 'Producción (www1.agenciatributaria.gob.es)'}
              </p>
              <p>
                <strong>Tipo recomendado:</strong> Certificado de sello para TPV automatizado
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del Circuit Breaker */}
      {isEnabled && connectionStatus.circuitBreaker && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Circuit Breaker:</span>
                <span
                  className={`ml-2 font-medium ${
                    connectionStatus.circuitBreaker.state === 'CLOSED'
                      ? 'text-green-500'
                      : connectionStatus.circuitBreaker.state === 'OPEN'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}
                >
                  {connectionStatus.circuitBreaker.state}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fallos:</span>
                <span className="ml-2 font-medium">{connectionStatus.circuitBreaker.failures}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Éxitos:</span>
                <span className="ml-2 font-medium">
                  {connectionStatus.circuitBreaker.successes}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Endpoint:</span>
                <span className="ml-2 font-medium text-xs truncate">
                  {connectionStatus.endpoint.substring(0, 30)}...
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AEATSettings;
