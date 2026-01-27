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
import { useCallback, useEffect, useRef, useState } from 'react';
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
  state: AEATSidecarState;
  start: () => Promise<SidecarResult<void>>;
  stop: () => Promise<SidecarResult<void>>;
  restart: () => Promise<SidecarResult<void>>;
  isAvailable: boolean;
}

// ==================== Constants ====================

const DEFAULT_PORT = 3001;
const DEFAULT_HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const DEFAULT_MAX_RESTART_ATTEMPTS = 3;
const STARTUP_TIMEOUT = 15000; // 15 seconds

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
  const [state, setState] = useState<AEATSidecarState>({
    status: 'stopped',
    port,
  });

  // Refs
  const childProcessRef = useRef<Child | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restartAttemptsRef = useRef(0);
  const isStartingRef = useRef(false);

  // Check if sidecar feature is available (only in Tauri)
  const isAvailable = isTauri();

  /**
   * Inicia el sidecar
   */
  const start = useCallback(async (): Promise<SidecarResult<void>> => {
    if (!isAvailable) {
      return err({
        code: AEATErrorCode.ModeNotAvailable,
        message: 'Sidecar mode is only available in Tauri environment',
      });
    }

    if (isStartingRef.current) {
      return err({
        code: AEATErrorCode.SidecarStartFailed,
        message: 'Sidecar is already starting',
      });
    }

    if (state.status === 'running') {
      return ok(undefined);
    }

    isStartingRef.current = true;
    setState((prev) => ({ ...prev, status: 'starting', error: undefined }));

    const result = await tryCatchAsync(async () => {
      // Crear comando del sidecar
      const command = Command.sidecar('sidecars/aeat-bridge', ['--port', port.toString()]);

      // Configurar listeners
      command.on('close', (data) => {
        console.log(`[AEAT Sidecar] Process closed with code ${data.code}`);
        childProcessRef.current = null;

        if (data.code !== 0 && state.status === 'running') {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: `Process exited with code ${data.code}`,
          }));

          // Auto-restart si no hemos excedido el límite
          if (restartAttemptsRef.current < maxRestartAttempts) {
            restartAttemptsRef.current++;
            console.log(
              `[AEAT Sidecar] Attempting restart ${restartAttemptsRef.current}/${maxRestartAttempts}`
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
      childProcessRef.current = child;

      // Esperar a que el servicio esté listo
      const isReady = await waitForServiceReady(port);

      if (!isReady) {
        // Matar el proceso si no está listo
        await child.kill();
        throw new Error('Service failed to start within timeout');
      }

      // Éxito
      restartAttemptsRef.current = 0;
      setState({
        status: 'running',
        pid: child.pid,
        port,
        startedAt: new Date(),
      });
    }, AEATErrorCode.SidecarStartFailed);

    isStartingRef.current = false;

    if (isErr(result)) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: result.error.message,
      }));
    }

    return result;
  }, [isAvailable, state.status, port, maxRestartAttempts]);

  /**
   * Detiene el sidecar
   */
  const stop = useCallback(async (): Promise<SidecarResult<void>> => {
    if (!isAvailable) {
      return err({
        code: AEATErrorCode.ModeNotAvailable,
        message: 'Sidecar mode is only available in Tauri environment',
      });
    }

    if (state.status === 'stopped' || !childProcessRef.current) {
      setState((prev) => ({ ...prev, status: 'stopped' }));
      return ok(undefined);
    }

    setState((prev) => ({ ...prev, status: 'stopping' }));

    const result = await tryCatchAsync(async () => {
      if (childProcessRef.current) {
        await childProcessRef.current.kill();
        childProcessRef.current = null;
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
  }, [isAvailable, state.status, port]);

  /**
   * Reinicia el sidecar
   */
  const restart = useCallback(async (): Promise<SidecarResult<void>> => {
    const stopResult = await stop();
    if (isErr(stopResult)) {
      return stopResult;
    }

    // Pequeña pausa antes de reiniciar
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return start();
  }, [stop, start]);

  /**
   * Health check periódico
   */
  useEffect(() => {
    if (state.status !== 'running' || !healthCheckInterval) {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      return;
    }

    healthCheckIntervalRef.current = setInterval(async () => {
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

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [state.status, healthCheckInterval, port]);

  /**
   * Auto-start al montar
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: Deliberadamente excluimos start y state.status para evitar loops infinitos
  useEffect(() => {
    if (autoStart && isAvailable && state.status === 'stopped') {
      start();
    }
  }, [autoStart, isAvailable]);

  /**
   * Cleanup al desmontar
   */
  useEffect(() => {
    return () => {
      if (childProcessRef.current) {
        childProcessRef.current.kill().catch(console.error);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    state,
    start,
    stop,
    restart,
    isAvailable,
  };
}

export default useAEATSidecar;
