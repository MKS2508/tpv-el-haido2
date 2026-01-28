/**
 * useAEATSidecar Hook
 *
 * Gestiona el ciclo de vida del sidecar AEAT Bridge:
 * - Arranque automático
 * - Health checks periódicos
 * - Auto-restart en caso de crash
 * - Detención limpia
 */

import { err, isErr, ok, type Result, tryCatchAsync } from '@mks2508/no-throw';
import { type Child, Command } from '@tauri-apps/plugin-shell';
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { config } from '@/lib/config';
import { AEATErrorCode, type AEATResultError } from '@/lib/error-codes';
import type { AEATSidecarState } from '@/models/AEAT';

// ==================== Types ====================

type SidecarResult<T> = Result<T, AEATResultError>;

interface UseAEATSidecarOptions {
  port?: number;
  autoStart?: boolean;
  healthCheckInterval?: number;
  maxRestartAttempts?: number;
}

interface UseAEATSidecarReturn {
  state: () => AEATSidecarState;
  start: () => Promise<SidecarResult<void>>;
  stop: () => Promise<SidecarResult<void>>;
  restart: () => Promise<SidecarResult<void>>;
  isAvailable: boolean;
}

// ==================== Constants (from config) ====================

const DEFAULT_PORT = config.aeat.port;
const DEFAULT_HEALTH_CHECK_INTERVAL = config.aeat.healthCheckInterval;
const DEFAULT_MAX_RESTART_ATTEMPTS = config.aeat.maxRestartAttempts;
const STARTUP_TIMEOUT = config.aeat.startupTimeout;

// ==================== Utilities ====================

/**
 * Verifica si estamos en entorno Tauri
 */
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Espera a que el servicio esté listo
 */
async function waitForServiceReady(
  port: number,
  timeout: number = STARTUP_TIMEOUT
): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 500;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Servicio aún no está listo, continuar esperando
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false;
}

// ==================== Hook ====================

export function useAEATSidecar(options: UseAEATSidecarOptions = {}): UseAEATSidecarReturn {
  const {
    port = DEFAULT_PORT,
    autoStart = false,
    healthCheckInterval = DEFAULT_HEALTH_CHECK_INTERVAL,
    maxRestartAttempts = DEFAULT_MAX_RESTART_ATTEMPTS,
  } = options;

  // State
  const [state, setState] = createSignal<AEATSidecarState>({
    status: 'stopped',
    port,
  });

  // Refs (using signals for mutable state)
  let childProcessRef: Child | null = null;
  let healthCheckIntervalRef: ReturnType<typeof setInterval> | null = null;
  let restartAttemptsCount = 0;
  let isStarting = false;

  // Check if sidecar feature is available (only in Tauri)
  const isAvailable = isTauri();

  /**
   * Inicia el sidecar
   */
  const start = async (): Promise<SidecarResult<void>> => {
    if (!isAvailable) {
      return err({
        code: AEATErrorCode.ModeNotAvailable,
        message: 'Sidecar mode is only available in Tauri environment',
      });
    }

    if (isStarting) {
      return err({
        code: AEATErrorCode.SidecarStartFailed,
        message: 'Sidecar is already starting',
      });
    }

    if (state().status === 'running') {
      return ok(undefined);
    }

    isStarting = true;
    setState((prev) => ({ ...prev, status: 'starting', error: undefined }));

    const result = await tryCatchAsync(async () => {
      // Crear comando del sidecar
      const command = Command.sidecar('sidecars/aeat-bridge', ['--port', port.toString()]);

      // Configurar listeners
      command.on('close', (data) => {
        console.log(`[AEAT Sidecar] Process closed with code ${data.code}`);
        childProcessRef = null;

        if (data.code !== 0 && state().status === 'running') {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: `Process exited with code ${data.code}`,
          }));

          // Auto-restart si no hemos excedido el límite
          if (restartAttemptsCount < maxRestartAttempts) {
            restartAttemptsCount++;
            console.log(
              `[AEAT Sidecar] Attempting restart ${restartAttemptsCount}/${maxRestartAttempts}`
            );
            setTimeout(() => start(), 2000);
          }
        } else {
          setState((prev) => ({ ...prev, status: 'stopped' }));
        }
      });

      command.on('error', (error) => {
        console.error('[AEAT Sidecar] Process error:', error);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: error,
        }));
      });

      command.stdout.on('data', (line) => {
        console.log(`[AEAT Sidecar stdout] ${line}`);
      });

      command.stderr.on('data', (line) => {
        console.error(`[AEAT Sidecar stderr] ${line}`);
      });

      // Spawn el proceso
      const child = await command.spawn();
      childProcessRef = child;

      // Esperar a que el servicio esté listo
      const isReady = await waitForServiceReady(port);

      if (!isReady) {
        // Matar el proceso si no está listo
        await child.kill();
        throw new Error('Service failed to start within timeout');
      }

      // Éxito
      restartAttemptsCount = 0;
      setState({
        status: 'running',
        pid: child.pid,
        port,
        startedAt: new Date(),
      });
    }, AEATErrorCode.SidecarStartFailed);

    isStarting = false;

    if (isErr(result)) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: result.error.message,
      }));
    }

    return result;
  };

  /**
   * Detiene el sidecar
   */
  const stop = async (): Promise<SidecarResult<void>> => {
    if (!isAvailable) {
      return err({
        code: AEATErrorCode.ModeNotAvailable,
        message: 'Sidecar mode is only available in Tauri environment',
      });
    }

    if (state().status === 'stopped' || !childProcessRef) {
      setState((prev) => ({ ...prev, status: 'stopped' }));
      return ok(undefined);
    }

    setState((prev) => ({ ...prev, status: 'stopping' }));

    const result = await tryCatchAsync(async () => {
      if (childProcessRef) {
        await childProcessRef.kill();
        childProcessRef = null;
      }
      setState({ status: 'stopped', port });
    }, AEATErrorCode.SidecarStopFailed);

    if (isErr(result)) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: result.error.message,
      }));
    }

    return result;
  };

  /**
   * Reinicia el sidecar
   */
  const restart = async (): Promise<SidecarResult<void>> => {
    const stopResult = await stop();
    if (isErr(stopResult)) {
      return stopResult;
    }

    // Pequeña pausa antes de reiniciar
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return start();
  };

  /**
   * Health check periódico
   */
  createEffect(() => {
    const currentState = state();
    if (currentState.status !== 'running' || !healthCheckInterval) {
      if (healthCheckIntervalRef) {
        clearInterval(healthCheckIntervalRef);
        healthCheckIntervalRef = null;
      }
      return;
    }

    healthCheckIntervalRef = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${port}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          console.warn('[AEAT Sidecar] Health check failed, service may be unhealthy');
        }
      } catch (error) {
        console.error('[AEAT Sidecar] Health check error:', error);
        // El proceso puede haber muerto, el listener de 'close' manejará esto
      }
    }, healthCheckInterval);
  });

  /**
   * Cleanup al desmontar
   */
  onCleanup(() => {
    if (childProcessRef) {
      childProcessRef.kill().catch(console.error);
    }
    if (healthCheckIntervalRef) {
      clearInterval(healthCheckIntervalRef);
    }
  });

  /**
   * Auto-start al montar
   */
  onMount(() => {
    if (autoStart && isAvailable && state().status === 'stopped') {
      start();
    }
  });

  return {
    state,
    start,
    stop,
    restart,
    isAvailable,
  };
}

export default useAEATSidecar;
