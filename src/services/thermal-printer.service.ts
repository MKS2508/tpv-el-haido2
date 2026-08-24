import type { Result } from '@mks2508/no-throw';
import { err, isErr, ok, tryCatchAsync } from '@mks2508/no-throw';
import {
  createTickmaster,
  type IDiscoveryResolver,
  type IPrinterStatus,
  type IPrintResult,
  type ITicket,
  type ITickmaster,
  type TickmasterSdkError,
} from '@mks2508/tickmaster/sdk';
import { invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { PrinterErrorCode, type PrinterResultError } from '@/lib/error-codes';
import { printerLog } from '@/lib/logger';
import type Order from '@/models/Order';
import type {
  DiscoveredPrinter,
  PrinterHealth,
  TickmasterPrinterConfig,
} from '@/models/ThermalPrinter';
import { isTauri } from '@/services/platform';

export type PrinterResult<T> = Result<T, PrinterResultError>;

const DISCOVERY_TIMEOUT_MS = 1500;

/**
 * Resolver de discovery apoyado en el comando Rust.
 *
 * El webview no tiene sockets UDP; `discover_printer` hace el broadcast en el
 * backend y devuelve la URL ya compuesta con la IP de origen del anuncio.
 */
class TauriDiscoveryResolver implements IDiscoveryResolver {
  private lastFound: DiscoveredPrinter | null = null;

  get found(): DiscoveredPrinter | null {
    return this.lastFound;
  }

  async resolve(): Promise<string> {
    const printer = await invoke<DiscoveredPrinter>('discover_printer', {
      timeoutMs: DISCOVERY_TIMEOUT_MS,
    });
    this.lastFound = printer;
    return printer.baseUrl;
  }
}

/**
 * Fetch con el que el SDK habla con el daemon.
 *
 * El del webview no sirve: la peticion lleva `Authorization`, eso obliga a un
 * preflight CORS, y el daemon no responde `OPTIONS` ni emite cabeceras
 * `Access-Control-*` — el navegador la aborta antes de enviarla. El del plugin
 * http sale por Rust, donde no hay politica de origen. Mismo criterio que
 * `http-storage-adapter`.
 *
 * @returns `tauriFetch` bajo Tauri, el global en el build PWA
 */
function printerFetch(): typeof fetch {
  return isTauri() ? (tauriFetch as typeof fetch) : fetch;
}

/** Cliente vivo más el resolver que lo alimenta, si va por discovery. */
interface ClientEntry {
  readonly key: string;
  readonly tm: ITickmaster;
  readonly resolver: TauriDiscoveryResolver | null;
}

let cachedEntry: ClientEntry | null = null;

/**
 * Devuelve el cliente de la config dada, reutilizándolo entre operaciones.
 *
 * El cliente se cachea a propósito: `createTickmaster` memoiza la URL resuelta,
 * así que uno nuevo por operación significaría un broadcast por cada ticket.
 *
 * @param config - URL y token; baseUrl vacía activa el discovery
 * @returns Cliente cacheado para esa config
 */
function clientFor(config: TickmasterPrinterConfig): ClientEntry {
  const baseUrl = config.baseUrl.trim();
  const key = `${baseUrl} ${config.token}`;
  if (cachedEntry !== null && cachedEntry.key === key) return cachedEntry;

  const resolver = baseUrl === '' ? new TauriDiscoveryResolver() : null;
  const common = { token: config.token, fetch: printerFetch() };
  const tm =
    resolver === null
      ? createTickmaster({ ...common, baseUrl })
      : createTickmaster({ ...common, discovery: resolver });

  cachedEntry = { key, tm, resolver };
  return cachedEntry;
}

/**
 * Tira el cliente cacheado para que la siguiente operación vuelva a descubrir.
 *
 * Hace falta aunque el SDK ya descarte una resolución fallida: si el router le
 * da otra IP a la Raspberry, la URL cacheada resolvió bien en su día y solo el
 * fallo de red delata que ya no vale.
 */
function invalidateClient(): void {
  cachedEntry = null;
}

/**
 * Ejecuta una operación del SDK mapeando el error a la taxonomía de la app.
 *
 * @param config - Config de la impresora
 * @param code - Código de error de la app si la operación falla
 * @param operation - Operación a ejecutar contra el cliente
 * @returns Resultado de la operación
 */
async function withClient<T>(
  config: TickmasterPrinterConfig,
  code: PrinterResultError['code'],
  operation: (tm: ITickmaster) => Promise<Result<T, TickmasterSdkError>>
): Promise<PrinterResult<T>> {
  const start = Date.now();
  printerLog.debug('thermal-printer: withClient start', { code });
  let result: Result<T, TickmasterSdkError>;
  try {
    result = await operation(clientFor(config).tm);
  } catch (thrown) {
    // El SDK hasta 0.1.1 deja escapar el rechazo del resolver de discovery por
    // encima de `.safe()`, y el comando de Tauri rechaza con un string pelado.
    invalidateClient();
    printerLog.debug('thermal-printer: withClient done', {
      code,
      ms: Date.now() - start,
      error: true,
    });
    return err({ code, message: thrown instanceof Error ? thrown.message : String(thrown) });
  }
  if (isErr(result)) {
    if (result.error.code === 'TM_DAEMON_UNREACHABLE') invalidateClient();
    printerLog.debug('thermal-printer: withClient done', {
      code,
      ms: Date.now() - start,
      error: true,
    });
    return err({ code, message: result.error.message });
  }
  printerLog.debug('thermal-printer: withClient done', {
    code,
    ms: Date.now() - start,
    error: false,
  });
  return ok(result.value);
}

export function orderToTicket(order: Order, ivaRatePercent: number): ITicket {
  return {
    cabecera: 'BAR EL HAIDO',
    meta: {
      Ticket: `#${order.id}`,
      Mesa: order.tableNumber === 0 ? 'Barra' : String(order.tableNumber),
      Fecha: order.date,
    },
    items: order.items.map((item) => ({
      nombre: item.name,
      cantidad: item.quantity,
      precioUnitario: item.price,
    })),
    ivaRate: ivaRatePercent > 0 ? ivaRatePercent / 100 : undefined,
    pago:
      order.status === 'paid'
        ? { metodo: order.paymentMethod, entregado: order.totalPaid }
        : undefined,
    pie: '¡Gracias por su visita!',
  };
}

export async function printOrder(
  order: Order,
  config: TickmasterPrinterConfig,
  ivaRatePercent: number
): Promise<PrinterResult<IPrintResult>> {
  return withClient(config, PrinterErrorCode.PrintFailed, (tm) =>
    tm.tickets.safe.print(orderToTicket(order, ivaRatePercent))
  );
}

export async function printTestTicket(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<IPrintResult>> {
  return withClient(config, PrinterErrorCode.TestFailed, (tm) =>
    tm.tickets.safe.print({
      cabecera: 'BAR EL HAIDO',
      items: [{ nombre: 'Ticket de prueba', cantidad: 1, precioUnitario: 1 }],
      pie: 'Prueba de impresión OK',
    })
  );
}

export async function testConnection(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<IPrinterStatus>> {
  return withClient(config, PrinterErrorCode.ConnectionFailed, (tm) => tm.printer.safe.status());
}

export async function openDrawer(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<{ opened: boolean }>> {
  return withClient(config, PrinterErrorCode.CashDrawerFailed, (tm) => tm.drawer.safe.open());
}

/**
 * Busca la impresora por broadcast UDP en la red local.
 *
 * Solo alcanza a quien comparte segmento de red, que es el caso del bar: el TPV
 * y la Raspberry cuelgan del mismo router.
 *
 * @param timeoutMs - Espera máxima por una respuesta
 * @returns Impresora encontrada, o error si nadie contesta
 */
export async function discoverPrinter(
  timeoutMs: number = DISCOVERY_TIMEOUT_MS
): Promise<PrinterResult<DiscoveredPrinter>> {
  printerLog.debug('thermal-printer: discoverPrinter start', { timeoutMs });
  const result = await tryCatchAsync(
    async () => invoke<DiscoveredPrinter>('discover_printer', { timeoutMs }),
    PrinterErrorCode.ConnectionFailed
  );
  if (isErr(result)) {
    printerLog.debug('thermal-printer: discoverPrinter done', {
      timeoutMs,
      found: false,
      error: result.error.message,
    });
    return err({ code: PrinterErrorCode.ConnectionFailed, message: result.error.message });
  }
  printerLog.debug('thermal-printer: discoverPrinter done', {
    timeoutMs,
    found: true,
    baseUrl: result.value.baseUrl,
  });
  invalidateClient();
  return ok(result.value);
}

/**
 * Estado de "no hay daemon al que hablar", con la pista según cómo se configuró.
 *
 * @param config - Config con la que se intentó
 * @param detail - Motivo técnico, por si la URL era explícita
 * @returns Diagnóstico de camino cortado
 */
function unreachableHealth(config: TickmasterPrinterConfig, detail: string): PrinterHealth {
  const configured = config.baseUrl.trim();
  return {
    state: 'no-daemon',
    canPrint: false,
    title: 'Sin conexión con la impresora',
    detail:
      configured === ''
        ? 'No se encontró ninguna impresora en la red. Comprueba que la Raspberry está encendida y en el mismo router.'
        : `${configured} no responde (${detail}). Comprueba la dirección, o déjala vacía para buscarla en la red.`,
    baseUrl: null,
    paperNearEnd: false,
  };
}

/**
 * Diagnostica el camino completo app → daemon → impresora.
 *
 * Nunca falla: cada escalón del camino tiene su estado. El daemon contesta
 * aunque la impresora esté apagada o sin papel, así que "hay conexión" y "se
 * puede imprimir" son dos cosas distintas y la UI tiene que poder decirlas.
 *
 * @param config - Config a diagnosticar; baseUrl vacía dispara el discovery
 * @returns Diagnóstico legible
 *
 * @example
 * ```typescript
 * const health = await checkPrinterHealth(config);
 * if (!health.canPrint) toast({ title: health.title, description: health.detail });
 * ```
 */
export async function checkPrinterHealth(config: TickmasterPrinterConfig): Promise<PrinterHealth> {
  const entry = clientFor(config);

  let result: Result<IPrinterStatus, TickmasterSdkError>;
  try {
    result = await entry.tm.printer.safe.status();
  } catch (thrown) {
    invalidateClient();
    return unreachableHealth(config, thrown instanceof Error ? thrown.message : String(thrown));
  }

  if (isErr(result)) {
    const code = result.error.code;
    if (code === 'TM_UNAUTHORIZED' || code === 'TM_FORBIDDEN') {
      return {
        state: 'unauthorized',
        canPrint: false,
        title: 'El daemon rechaza a este equipo',
        detail:
          code === 'TM_UNAUTHORIZED'
            ? 'La impresora responde, pero el token no es válido. Revísalo arriba.'
            : 'La impresora responde, pero esta IP no está en su lista de permitidas.',
        baseUrl: entry.resolver?.found?.baseUrl ?? config.baseUrl.trim(),
        paperNearEnd: false,
      };
    }
    if (code === 'TM_DAEMON_UNREACHABLE') invalidateClient();
    return unreachableHealth(config, result.error.message);
  }

  const baseUrl = entry.resolver?.found?.baseUrl ?? config.baseUrl.trim();
  const status = result.value;
  const base = { baseUrl, paperNearEnd: status.paperNearEnd } as const;

  if (!status.connected) {
    return {
      ...base,
      state: 'no-printer',
      canPrint: false,
      title: 'Daemon en línea, impresora no detectada',
      detail: 'El adaptador USB de la impresora no aparece. Comprueba el cable a la Raspberry.',
    };
  }
  if (status.coverOpen) {
    return {
      ...base,
      state: 'cover-open',
      canPrint: false,
      title: 'Tapa abierta',
      detail: 'Cierra la tapa de la impresora.',
    };
  }
  if (status.paperOut) {
    return {
      ...base,
      state: 'paper-out',
      canPrint: false,
      title: 'Sin papel',
      detail: 'Carga un rollo nuevo.',
    };
  }
  if (!status.online) {
    return {
      ...base,
      state: 'printer-offline',
      canPrint: false,
      title: 'Impresora apagada o sin línea',
      detail: 'El daemon la ve conectada pero no responde. Comprueba que está encendida.',
    };
  }
  if (status.error) {
    return {
      ...base,
      state: 'printer-error',
      canPrint: false,
      title: 'La impresora reporta un error',
      detail: 'Apágala y vuelve a encenderla; si sigue, revisa el mecanismo.',
    };
  }

  return {
    ...base,
    state: 'ready',
    canPrint: true,
    title: 'Impresora lista',
    detail: status.paperNearEnd
      ? 'Imprime con normalidad, pero el rollo está por acabarse.'
      : 'Conectada, con papel y en línea.',
  };
}

// IMPORTANTE: nunca loguear `config` (contiene el token del daemon) — el bug del
// servicio viejo (`console.log('Saving thermal printer configuration:', config)`) NO se
// replica aquí.
export async function savePrinterConfig(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<void>> {
  const result = await tryCatchAsync(
    async () => invoke('write_json_config', { config }),
    PrinterErrorCode.ConfigError
  );
  if (isErr(result)) {
    return err({ code: PrinterErrorCode.ConfigError, message: result.error.message });
  }
  invalidateClient();
  return ok(undefined);
}

export async function loadPrinterConfig(): Promise<PrinterResult<TickmasterPrinterConfig | null>> {
  const result = await tryCatchAsync(
    async () => invoke<Record<string, unknown> | null>('read_json_config'),
    PrinterErrorCode.ConfigError
  );
  if (isErr(result)) {
    return err({ code: PrinterErrorCode.ConfigError, message: result.error.message });
  }
  const raw = result.value;
  if (raw === null) return ok(null);
  if (typeof raw.baseUrl !== 'string' || typeof raw.token !== 'string') {
    return err({
      code: PrinterErrorCode.ConfigError,
      message: 'printerSettings.json: falta baseUrl/token o tiene forma inválida',
    });
  }
  return ok({ baseUrl: raw.baseUrl, token: raw.token });
}
