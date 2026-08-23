/** Config del daemon tickmaster (RPI-BAR): URL base HTTP + token bearer. */
export interface TickmasterPrinterConfig {
  /** URL del daemon. Vacía = descubrir la impresora en la red por UDP. */
  readonly baseUrl: string;
  readonly token: string;
}

/** Impresora encontrada por el descubrimiento UDP de la LAN. */
export interface DiscoveredPrinter {
  /** URL compuesta con la IP desde la que contestó el daemon. */
  readonly baseUrl: string;
  /** Hostname que anuncia el daemon. */
  readonly name: string;
  /** Modelo de impresora que anuncia el daemon. */
  readonly model: string;
}

/**
 * Estado del camino app → daemon → impresora, del peor al mejor.
 *
 * Estar conectado al daemon no significa poder imprimir: el daemon corre en la
 * Raspberry y contesta aunque la impresora esté apagada, sin papel o
 * desenchufada del adaptador USB.
 */
export type PrinterHealthState =
  /** No hay daemon: no se descubrió ninguno, o la URL configurada no responde. */
  | 'no-daemon'
  /** El daemon responde pero rechaza al cliente: token incorrecto o IP fuera de la allowlist. */
  | 'unauthorized'
  /** El daemon responde pero no ve el adaptador USB de la impresora. */
  | 'no-printer'
  /** Tapa abierta. */
  | 'cover-open'
  /** Sin papel. */
  | 'paper-out'
  /** Adaptador presente pero la impresora no está en línea (apagada, en error). */
  | 'printer-offline'
  /** La impresora reporta error. */
  | 'printer-error'
  /** Lista para imprimir. */
  | 'ready';

/** Diagnóstico legible del estado de la impresora. */
export interface PrinterHealth {
  readonly state: PrinterHealthState;
  /** true solo si se puede imprimir ahora mismo. */
  readonly canPrint: boolean;
  /** Titular para la UI. */
  readonly title: string;
  /** Qué hacer al respecto. */
  readonly detail: string;
  /** URL con la que se habló; null si no se llegó al daemon. */
  readonly baseUrl: string | null;
  /** El rollo está por acabarse. El ticket sale igual. */
  readonly paperNearEnd: boolean;
}
