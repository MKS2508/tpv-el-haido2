import type { Result } from '@mks2508/no-throw';
import { err, isErr, ok, tryCatchAsync } from '@mks2508/no-throw';
import {
  createTickmaster,
  type IPrinterStatus,
  type IPrintResult,
  type ITicket,
} from '@mks2508/tickmaster/sdk';
import { invoke } from '@tauri-apps/api/core';
import { PrinterErrorCode, type PrinterResultError } from '@/lib/error-codes';
import type Order from '@/models/Order';
import type { TickmasterPrinterConfig } from '@/models/ThermalPrinter';

export type PrinterResult<T> = Result<T, PrinterResultError>;

function buildClient(config: TickmasterPrinterConfig) {
  return createTickmaster({ baseUrl: config.baseUrl, token: config.token });
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
  const tm = buildClient(config);
  const result = await tm.tickets.safe.print(orderToTicket(order, ivaRatePercent));
  if (isErr(result)) {
    return err({ code: PrinterErrorCode.PrintFailed, message: result.error.message });
  }
  return ok(result.value);
}

export async function printTestTicket(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<IPrintResult>> {
  const tm = buildClient(config);
  const result = await tm.tickets.safe.print({
    cabecera: 'BAR EL HAIDO',
    items: [{ nombre: 'Ticket de prueba', cantidad: 1, precioUnitario: 1 }],
    pie: 'Prueba de impresión OK',
  });
  if (isErr(result)) {
    return err({ code: PrinterErrorCode.TestFailed, message: result.error.message });
  }
  return ok(result.value);
}

export async function testConnection(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<IPrinterStatus>> {
  const tm = buildClient(config);
  const result = await tm.printer.safe.status();
  if (isErr(result)) {
    return err({ code: PrinterErrorCode.ConnectionFailed, message: result.error.message });
  }
  return ok(result.value);
}

export async function openDrawer(
  config: TickmasterPrinterConfig
): Promise<PrinterResult<{ opened: boolean }>> {
  const tm = buildClient(config);
  const result = await tm.drawer.safe.open();
  if (isErr(result)) {
    return err({ code: PrinterErrorCode.CashDrawerFailed, message: result.error.message });
  }
  return ok(result.value);
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
  return isErr(result)
    ? err({ code: PrinterErrorCode.ConfigError, message: result.error.message })
    : ok(undefined);
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
