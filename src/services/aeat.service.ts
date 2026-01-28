/**
 * AEAT VERI*FACTU Service
 *
 * Cliente HTTP para comunicarse con el bridge REST-to-SOAP de AEAT.
 * Implementa el patrón Result para manejo de errores.
 */

import { err, type Result, tryCatchAsync } from '@mks2508/no-throw';
import { config } from '@/lib/config';
import { AEATErrorCode, type AEATResultError } from '@/lib/error-codes';
import type {
  AEATApiResponse,
  AEATConfig,
  AEATConnectionStatus,
  AEATHealthResponse,
  AEATSoapHealthResponse,
  ConsultaFacturasFilters,
  ConsultarFacturasResponse,
  RegistrarFacturaRequest,
  RegistrarFacturaResponse,
} from '@/models/AEAT';

// ==================== Types ====================

export type AEATResult<T> = Result<T, AEATResultError>;

// ==================== Service Class ====================

class AEATService {
  private baseUrl: string = '';
  private timeout: number = config.aeat.timeout;

  /**
   * Configura el servicio con los parámetros de conexión
   */
  configure(aeatConfig: AEATConfig): void {
    if (aeatConfig.mode === 'external' && aeatConfig.externalUrl) {
      this.baseUrl = aeatConfig.externalUrl.replace(/\/$/, '');
    } else if (aeatConfig.mode === 'sidecar') {
      this.baseUrl = `http://localhost:${aeatConfig.sidecarPort}`;
    } else {
      this.baseUrl = '';
    }
    this.timeout = aeatConfig.requestTimeout || config.aeat.timeout;
  }

  /**
   * Obtiene la URL base actual
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Verifica si el servicio está configurado
   */
  isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  // ==================== Health Checks ====================

  /**
   * Health check básico del servicio
   */
  async checkHealth(): Promise<AEATResult<AEATHealthResponse>> {
    if (!this.isConfigured()) {
      return err({
        code: AEATErrorCode.ConfigurationInvalid,
        message: 'AEAT service not configured',
      });
    }

    const result = await tryCatchAsync(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as AEATApiResponse<AEATHealthResponse>;

        if (!data.success) {
          throw new Error(data.error?.message || 'Health check failed');
        }

        return data.data;
      } finally {
        clearTimeout(timeoutId);
      }
    }, AEATErrorCode.ConnectionFailed);

    return result;
  }

  /**
   * Health check con prueba de conexión SOAP
   */
  async checkSoapHealth(): Promise<AEATResult<AEATSoapHealthResponse>> {
    if (!this.isConfigured()) {
      return err({
        code: AEATErrorCode.ConfigurationInvalid,
        message: 'AEAT service not configured',
      });
    }

    const result = await tryCatchAsync(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/health/soap`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as AEATApiResponse<AEATSoapHealthResponse>;

        if (!data.success) {
          throw new Error(data.error?.message || 'SOAP health check failed');
        }

        return data.data;
      } finally {
        clearTimeout(timeoutId);
      }
    }, AEATErrorCode.ConnectionFailed);

    return result;
  }

  /**
   * Obtiene el estado de conexión completo
   */
  async getConnectionStatus(config: AEATConfig): Promise<AEATConnectionStatus> {
    if (config.mode === 'disabled' || !this.isConfigured()) {
      return {
        isConnected: false,
        mode: config.mode,
        endpoint: '',
        lastCheck: null,
      };
    }

    const healthResult = await this.checkSoapHealth();

    if (healthResult.ok) {
      return {
        isConnected: healthResult.value.connected,
        mode: config.mode,
        endpoint: healthResult.value.endpoint,
        lastCheck: new Date(),
        circuitBreaker: healthResult.value.circuitBreaker,
      };
    }

    return {
      isConnected: false,
      mode: config.mode,
      endpoint: this.baseUrl,
      lastCheck: new Date(),
      error: healthResult.error.message,
    };
  }

  // ==================== Facturación ====================

  /**
   * Registra facturas en AEAT (alta o anulación)
   */
  async registrarFactura(
    request: RegistrarFacturaRequest
  ): Promise<AEATResult<RegistrarFacturaResponse>> {
    if (!this.isConfigured()) {
      return err({
        code: AEATErrorCode.ConfigurationInvalid,
        message: 'AEAT service not configured',
      });
    }

    const result = await tryCatchAsync(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/facturas/alta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        const data = (await response.json()) as AEATApiResponse<RegistrarFacturaResponse>;

        if (!data.success) {
          const errorResponse = data as {
            success: false;
            error: { code: string; message: string };
          };
          throw new Error(errorResponse.error?.message || 'Registration failed');
        }

        return (data as { success: true; data: RegistrarFacturaResponse }).data;
      } finally {
        clearTimeout(timeoutId);
      }
    }, AEATErrorCode.RegistrationFailed);

    return result;
  }

  /**
   * Consulta facturas en AEAT
   */
  async consultarFacturas(
    filters: ConsultaFacturasFilters
  ): Promise<AEATResult<ConsultarFacturasResponse>> {
    if (!this.isConfigured()) {
      return err({
        code: AEATErrorCode.ConfigurationInvalid,
        message: 'AEAT service not configured',
      });
    }

    const result = await tryCatchAsync(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/facturas/consultar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters),
          signal: controller.signal,
        });

        const data = (await response.json()) as AEATApiResponse<ConsultarFacturasResponse>;

        if (!data.success) {
          const errorResponse = data as {
            success: false;
            error: { code: string; message: string };
          };
          throw new Error(errorResponse.error?.message || 'Consultation failed');
        }

        return (data as { success: true; data: ConsultarFacturasResponse }).data;
      } finally {
        clearTimeout(timeoutId);
      }
    }, AEATErrorCode.ConsultationFailed);

    return result;
  }
}

// ==================== Singleton Export ====================

export const aeatService = new AEATService();

export default aeatService;
