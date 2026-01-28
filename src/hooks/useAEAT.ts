/**
 * useAEAT Hook
 *
 * Hook principal para integración con AEAT VERI*FACTU.
 * Combina la gestión del sidecar con el servicio HTTP.
 */

import { isErr } from '@mks2508/no-throw';
import { createEffect, createSignal } from 'solid-js';
import type {
  AEATConfig,
  AEATConnectionStatus,
  AEATSidecarState,
  ConsultaFacturasFilters,
  ConsultarFacturasResponse,
  RegistrarFacturaRequest,
  RegistrarFacturaResponse,
} from '@/models/AEAT';
import { DEFAULT_AEAT_CONFIG } from '@/models/AEAT';
import { type AEATResult, aeatService } from '@/services/aeat.service';
import { useAEATSidecar } from './useAEATSidecar';

// ==================== Types ====================

interface UseAEATOptions {
  config?: AEATConfig;
  onConnectionChange?: (status: AEATConnectionStatus) => void;
  onError?: (error: string) => void;
}

interface UseAEATReturn {
  // Estado
  config: () => AEATConfig;
  connectionStatus: () => AEATConnectionStatus;
  sidecarState: () => AEATSidecarState;
  isLoading: () => boolean;

  // Configuración
  updateConfig: (updates: Partial<AEATConfig>) => void;

  // Conexión
  testConnection: () => Promise<AEATResult<AEATConnectionStatus>>;
  refreshConnectionStatus: () => Promise<void>;

  // Sidecar (solo en modo sidecar)
  startSidecar: () => Promise<void>;
  stopSidecar: () => Promise<void>;
  restartSidecar: () => Promise<void>;
  isSidecarAvailable: boolean;

  // Facturación
  registrarFactura: (
    request: RegistrarFacturaRequest
  ) => Promise<AEATResult<RegistrarFacturaResponse>>;
  consultarFacturas: (
    filters: ConsultaFacturasFilters
  ) => Promise<AEATResult<ConsultarFacturasResponse>>;

  // Utilidades
  isEnabled: () => boolean;
  isConnected: () => boolean;
}

// ==================== Constants ====================

const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// ==================== Hook ====================

export function useAEAT(options: UseAEATOptions = {}): UseAEATReturn {
  const { onConnectionChange, onError } = options;

  // Config state
  const [config, setConfig] = createSignal<AEATConfig>(() => {
    // Intentar cargar desde localStorage
    try {
      const saved = localStorage.getItem('tpv-aeat-config');
      if (saved) {
        return { ...DEFAULT_AEAT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Ignorar errores de parsing
    }
    return DEFAULT_AEAT_CONFIG;
  });

  // Connection status
  const [connectionStatus, setConnectionStatus] = createSignal<AEATConnectionStatus>({
    isConnected: false,
    mode: config().mode,
    endpoint: '',
    lastCheck: null,
  });

  const [isLoading, setIsLoading] = createSignal(false);

  let connectionCheckIntervalRef: ReturnType<typeof setInterval> | null = null;
  let previousConnectionStatus = false;

  // Sidecar hook
  const sidecar = useAEATSidecar({
    port: config().sidecarPort,
    autoStart: config().mode === 'sidecar' && config().autoStartSidecar,
    healthCheckInterval: 10000,
    maxRestartAttempts: 3,
  });

  // Derived state
  const isEnabled = () => config().mode !== 'disabled';
  const isConnected = () => connectionStatus().isConnected;

  /**
   * Actualiza la configuración
   */
  const updateConfig = (updates: Partial<AEATConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      // Guardar en localStorage
      try {
        localStorage.setItem('tpv-aeat-config', JSON.stringify(newConfig));
      } catch {
        console.warn('Failed to save AEAT config to localStorage');
      }

      // Reconfigurar el servicio
      aeatService.configure(newConfig);

      return newConfig;
    });
  };

  /**
   * Prueba la conexión con el servicio
   */
  const testConnection = async (): Promise<AEATResult<AEATConnectionStatus>> => {
    setIsLoading(true);

    try {
      const status = await aeatService.getConnectionStatus(config());
      setConnectionStatus(status);

      // Notificar cambios de conexión
      if (status.isConnected !== previousConnectionStatus) {
        previousConnectionStatus = status.isConnected;
        onConnectionChange?.(status);
      }

      return { ok: true, value: status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);

      const status: AEATConnectionStatus = {
        isConnected: false,
        mode: config().mode,
        endpoint: aeatService.getBaseUrl(),
        lastCheck: new Date(),
        error: errorMessage,
      };

      setConnectionStatus(status);
      return {
        ok: false,
        error: {
          code: 'AEAT_CONNECTION_FAILED',
          message: errorMessage,
        },
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresca el estado de conexión
   */
  const refreshConnectionStatus = async () => {
    if (!isEnabled()) return;
    await testConnection();
  };

  /**
   * Inicia el sidecar
   */
  const startSidecar = async () => {
    if (config().mode !== 'sidecar') {
      console.warn('Sidecar can only be started in sidecar mode');
      return;
    }

    const result = await sidecar.start();
    if (isErr(result)) {
      onError?.(result.error.message);
    } else {
      // Esperar un poco y luego verificar conexión
      setTimeout(refreshConnectionStatus, 2000);
    }
  };

  /**
   * Detiene el sidecar
   */
  const stopSidecar = async () => {
    const result = await sidecar.stop();
    if (isErr(result)) {
      onError?.(result.error.message);
    }
    setConnectionStatus((prev) => ({ ...prev, isConnected: false }));
  };

  /**
   * Reinicia el sidecar
   */
  const restartSidecar = async () => {
    const result = await sidecar.restart();
    if (isErr(result)) {
      onError?.(result.error.message);
    } else {
      setTimeout(refreshConnectionStatus, 2000);
    }
  };

  /**
   * Registra facturas en AEAT
   */
  const registrarFactura = async (
    request: RegistrarFacturaRequest
  ): Promise<AEATResult<RegistrarFacturaResponse>> => {
    if (!isEnabled() || !isConnected()) {
      return {
        ok: false,
        error: {
          code: 'AEAT_SERVICE_UNAVAILABLE',
          message: 'AEAT service is not available',
        },
      };
    }

    setIsLoading(true);
    try {
      return await aeatService.registrarFactura(request);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Consulta facturas en AEAT
   */
  const consultarFacturas = async (
    filters: ConsultaFacturasFilters
  ): Promise<AEATResult<ConsultarFacturasResponse>> => {
    if (!isEnabled() || !isConnected()) {
      return {
        ok: false,
        error: {
          code: 'AEAT_SERVICE_UNAVAILABLE',
          message: 'AEAT service is not available',
        },
      };
    }

    setIsLoading(true);
    try {
      return await aeatService.consultarFacturas(filters);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Configurar servicio cuando cambia la configuración
   */
  createEffect(() => {
    aeatService.configure(config());
  });

  /**
   * Verificación periódica de conexión
   */
  createEffect(() => {
    if (!isEnabled()) {
      if (connectionCheckIntervalRef) {
        clearInterval(connectionCheckIntervalRef);
        connectionCheckIntervalRef = null;
      }
      return;
    }

    // Verificar conexión inicial
    refreshConnectionStatus();

    // Configurar verificación periódica
    connectionCheckIntervalRef = setInterval(
      refreshConnectionStatus,
      CONNECTION_CHECK_INTERVAL
    );
  });

  /**
   * Auto-start sidecar si está configurado
   */
  createEffect(() => {
    if (
      config().mode === 'sidecar' &&
      config().autoStartSidecar &&
      sidecar.isAvailable &&
      sidecar.state().status === 'stopped'
    ) {
      startSidecar();
    }
  });

  return {
    // Estado
    config,
    connectionStatus,
    sidecarState: sidecar.state,
    isLoading,

    // Configuración
    updateConfig,

    // Conexión
    testConnection,
    refreshConnectionStatus,

    // Sidecar
    startSidecar,
    stopSidecar,
    restartSidecar,
    isSidecarAvailable: sidecar.isAvailable,

    // Facturación
    registrarFactura,
    consultarFacturas,

    // Utilidades
    isEnabled,
    isConnected,
  };
}

export default useAEAT;
