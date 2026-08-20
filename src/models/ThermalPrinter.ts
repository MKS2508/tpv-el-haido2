/** Config del daemon tickmaster (RPI-BAR): URL base HTTP + token bearer. */
export interface TickmasterPrinterConfig {
  readonly baseUrl: string;
  readonly token: string;
}
