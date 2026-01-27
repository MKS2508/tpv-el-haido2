import { renderTicketPreview } from '@/assets/utils/utils.ts';
import type Order from '@/models/Order.ts';
export enum PrinterTypes {
  EPSON = 'epson',
  TANCA = 'tanca',
  STAR = 'star',
  DARUMA = 'daruma',
}

export enum BreakLine {
  NONE = 'NONE',
  CHARACTER = 'CHARACTER',
  WORD = 'WORD',
}

export enum CharacterSet {
  PC437_USA = 'PC437_USA',
  PC850_MULTILINGUAL = 'PC850_MULTILINGUAL',
  PC860_PORTUGUESE = 'PC860_PORTUGUESE',
  PC863_CANADIAN_FRENCH = 'PC863_CANADIAN_FRENCH',
  PC865_NORDIC = 'PC865_NORDIC',
  PC851_GREEK = 'PC851_GREEK',
  PC857_TURKISH = 'PC857_TURKISH',
  PC737_GREEK = 'PC737_GREEK',
  ISO8859_7_GREEK = 'ISO8859_7_GREEK',
  WPC1252 = 'WPC1252',
  PC866_CYRILLIC2 = 'PC866_CYRILLIC2',
  PC852_LATIN2 = 'PC852_LATIN2',
  SLOVENIA = 'SLOVENIA',
  PC858_EURO = 'PC858_EURO',
  WPC775_BALTIC_RIM = 'WPC775_BALTIC_RIM',
  PC855_CYRILLIC = 'PC855_CYRILLIC',
  PC861_ICELANDIC = 'PC861_ICELANDIC',
  PC862_HEBREW = 'PC862_HEBREW',
  PC864_ARABIC = 'PC864_ARABIC',
  PC869_GREEK = 'PC869_GREEK',
  ISO8859_2_LATIN2 = 'ISO8859_2_LATIN2',
  ISO8859_15_LATIN9 = 'ISO8859_15_LATIN9',
  PC1125_UKRANIAN = 'PC1125_UKRANIAN',
  WPC1250_LATIN2 = 'WPC1250_LATIN2',
  WPC1251_CYRILLIC = 'WPC1251_CYRILLIC',
  WPC1253_GREEK = 'WPC1253_GREEK',
  WPC1254_TURKISH = 'WPC1254_TURKISH',
  WPC1255_HEBREW = 'WPC1255_HEBREW',
  WPC1256_ARABIC = 'WPC1256_ARABIC',
  WPC1257_BALTIC_RIM = 'WPC1257_BALTIC_RIM',
  WPC1258_VIETNAMESE = 'WPC1258_VIETNAMESE',
  KZ1048_KAZAKHSTAN = 'KZ1048_KAZAKHSTAN',
  JAPAN = 'JAPAN',
  KOREA = 'KOREA',
  CHINA = 'CHINA',
  HK_TW = 'HK_TW',
  TCVN_VIETNAMESE = 'TCVN_VIETNAMESE',
}
/**
 * Interface para definir las opciones adicionales de la impresora.
 */
interface IPrinterOptions {
  timeout?: number;
}

/**
 * Interface para configurar las opciones del servicio de impresora térmica.
 */
export interface ThermalPrinterServiceOptions {
  /**
   * Tipo de impresora, por ejemplo, EPSON o STAR.
   * Esto define el tipo de comandos y configuraciones que la impresora usará.
   * Valor por defecto: PrinterTypes.EPSON.
   */
  type?: PrinterTypes;

  /**
   * La interfaz de conexión a la impresora, como 'tcp://xxx.xxx.xxx.xxx' para una impresora en red.
   * Es el punto de conexión que el servicio usará para comunicarse con la impresora.
   * Este campo es obligatorio.
   */
  interface: string;

  /**
   * Conjunto de caracteres que la impresora utilizará para la impresión.
   * Define cómo se interpretarán y mostrarán los caracteres en la impresora.
   * Valor por defecto: CharacterSet.PC852_LATIN2.
   */
  characterSet?: CharacterSet;

  /**
   * Determina si se eliminan los caracteres especiales del texto antes de la impresión.
   * Si se establece en `true`, los caracteres especiales serán removidos.
   * Valor por defecto: `false`.
   */
  removeSpecialCharacters?: boolean;

  /**
   * Caracter utilizado para dibujar líneas en el recibo impreso.
   * Permite personalizar el carácter que separa secciones en el recibo, como '-' o '='.
   * Valor por defecto: "-".
   */
  lineCharacter?: string;

  /**
   * Modo de corte de línea al final de una palabra o caracter.
   * Define cómo se manejará la ruptura de línea cuando el texto es demasiado largo para caber en una línea.
   * Valor por defecto: BreakLine.WORD.
   */
  breakLine?: BreakLine;

  /**
   * Opciones adicionales para la impresora, como el tiempo de espera de la conexión.
   * Permite establecer configuraciones adicionales que podrían ser específicas de la impresora o la conexión.
   * Valor por defecto: { timeout: 3000 }.
   */
  options?: IPrinterOptions;
}

class ThermalPrinter implements ThermalPrinterServiceOptions {
  openCashDrawer() {
    throw new Error('Method not implemented.');
  }
  private _type: PrinterTypes;
  private _interface: string;
  private _characterSet: CharacterSet;
  private _removeSpecialCharacters: boolean;
  private _lineCharacter: string;
  private _breakLine: BreakLine;
  private _options: IPrinterOptions;

  constructor(config: ThermalPrinterServiceOptions) {
    this._type = config.type || PrinterTypes.EPSON;
    this._interface = config.interface;
    this._characterSet = config.characterSet || CharacterSet.PC852_LATIN2;
    this._removeSpecialCharacters = config.removeSpecialCharacters || false;
    this._lineCharacter = config.lineCharacter || '-';
    this._breakLine = config.breakLine || BreakLine.WORD;
    this._options = config.options || { timeout: 3000 };
  }

  get type(): PrinterTypes {
    return this._type;
  }

  get interface(): string {
    return this._interface;
  }

  get characterSet(): CharacterSet {
    return this._characterSet;
  }

  get removeSpecialCharacters(): boolean {
    return this._removeSpecialCharacters;
  }

  get lineCharacter(): string {
    return this._lineCharacter;
  }

  get breakLine(): BreakLine {
    return this._breakLine;
  }

  get options(): IPrinterOptions {
    return this._options;
  }

  async isPrinterConnected() {
    return false;
  }

  println(text: string) {
    console.log(text);
  }

  async execute() {}

  async printImage(imagePath: string) {
    console.log(imagePath);
  }

  cut() {}
}

export default class ThermalPrinterService {
  private printer: ThermalPrinter;
  private _isConnected: boolean = false;

  /**
   * Constructor para inicializar el servicio de impresora térmica con la configuración proporcionada.
   * @param config - Opciones de configuración para la impresora.
   */
  constructor(config: ThermalPrinterServiceOptions) {
    this.printer = new ThermalPrinter({
      type: config.type || PrinterTypes.EPSON,
      interface: config.interface,
      characterSet: config.characterSet || CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: config.removeSpecialCharacters || false,
      lineCharacter: config.lineCharacter || '-',
      breakLine: config.breakLine || BreakLine.WORD,
      options: config.options || { timeout: 3000 },
    });
    console.log('Servicio de impresora inicializado con la configuración:', config);
  }

  /**
   * Verifica si la impresora está conectada.
   * @returns Un booleano indicando si la impresora está conectada.
   */
  public async isConnected(): Promise<boolean> {
    try {
      this._isConnected = await this.printer.isPrinterConnected();
      console.log('Estado de conexión de la impresora:', this._isConnected);
      return this._isConnected;
    } catch (error) {
      console.error('Error al verificar la conexión de la impresora:', error);
      throw new Error('No se pudo verificar la conexión de la impresora.');
    }
  }

  /**
   * Imprime texto en la impresora.
   * @param text - El texto que se desea imprimir.
   */
  public async printText(text: string): Promise<void> {
    try {
      this.ensureConnection();
      this.printer.println(text);
      await this.printer.execute();
      console.log('Texto impreso:', text);
    } catch (error) {
      console.error('Error al imprimir texto:', error);
      throw new Error('No se pudo imprimir el texto.');
    }
  }

  /**
   * Imprime una imagen en la impresora.
   * @param imagePath - Ruta de la imagen que se desea imprimir.
   */
  public async printImage(imagePath: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.printer.printImage(imagePath);
      await this.printer.execute();
      console.log('Imagen impresa desde:', imagePath);
    } catch (error) {
      console.error('Error al imprimir imagen:', error);
      throw new Error('No se pudo imprimir la imagen.');
    }
  }

  /**
   * Corta el papel de la impresora.
   */
  public async cutPaper(): Promise<void> {
    try {
      this.ensureConnection();
      this.printer.cut();
      await this.printer.execute();
      console.log('Papel cortado.');
    } catch (error) {
      console.error('Error al cortar el papel:', error);
      throw new Error('No se pudo cortar el papel.');
    }
  }

  /**
   * Abre la caja registradora conectada a la impresora.
   */
  public async openCashDrawer(): Promise<void> {
    try {
      this.ensureConnection();
      this.printer.openCashDrawer();
      await this.printer.execute();
      console.log('Caja registradora abierta.');
    } catch (error) {
      console.error('Error al abrir la caja registradora:', error);
      throw new Error('No se pudo abrir la caja registradora.');
    }
  }

  /**
   * Asegura que la impresora esté conectada antes de realizar cualquier operación.
   * @throws Error si la impresora no está conectada.
   */
  private ensureConnection(): void {
    if (!this._isConnected) {
      console.error('Error: La impresora no está conectada.');
      throw new Error('La impresora no está conectada.');
      //try to connect
    }
  }
  /**
   * imprime la orden actual en la impresora
   * @param order
   */
  public async printOrder(order: Order): Promise<void> {
    try {
      this.ensureConnection();
      this.printer.println(renderTicketPreview(order));
      await this.printer.execute();
      console.log('Orden impresa:', order);
    } catch (error) {
      console.error('Error al imprimir orden:', error);
      throw new Error('No se pudo imprimir la orden.');
    }
  }
  /**
   * Desconecta la impresora si está conectada.
   */
  public async disconnect(): Promise<void> {
    if (this._isConnected) {
      try {
        // Implementar lógica de desconexión si es aplicable.
        this._isConnected = false;
        console.log('Impresora desconectada.');
      } catch (error) {
        console.error('Error al desconectar la impresora:', error);
        throw new Error('No se pudo desconectar la impresora.');
      }
    } else {
      console.log('La impresora ya estaba desconectada.');
    }
  }
}
