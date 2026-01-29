/**
 * Screenshot Types
 * Tipos y constantes para el sistema de capturas con detección contextual
 */

export type ViewState = 'list' | 'detail' | 'form' | 'empty' | 'panel';

export interface ScreenshotContext {
  section: string;
  sectionLabel: string;
  subSection?: string;
  subSectionLabel?: string;
  viewState: ViewState;
  entityCount?: number;
}

// Mapeo de números de sección alineado con DOCUMENTO_PRESENTACION.md
export const SECTION_NUMBERS: Record<string, string> = {
  login: '01',
  home: '01',
  settings_usuarios: '02',
  products: '03',
  customers: '04',
  newOrder: '05',
  orderHistory: '06',
  aeatInvoices: '07',
  settings_verifactu: '08',
  aeatInvoices_detail: '09',
  settings_about: '10',
  settings: '11',
  settings_appearance: '12',
};

// Etiquetas de secciones
export const SECTION_LABELS: Record<string, string> = {
  login: 'Login',
  home: 'Inicio',
  settings: 'Ajustes',
  settings_usuarios: 'Usuarios',
  settings_verifactu: 'VERI*FACTU',
  settings_about: 'Acerca de',
  settings_appearance: 'Temas y Apariencia',
  products: 'Productos',
  customers: 'Clientes',
  newOrder: 'Nueva Comanda',
  orderHistory: 'Historial',
  aeatInvoices: 'Facturas AEAT',
};

// Etiquetas de tabs de settings
export const SETTINGS_TAB_LABELS: Record<string, string> = {
  general: 'General',
  appearance: 'Temas y Apariencia',
  users: 'Usuarios',
  printing: 'Impresión',
  pos: 'Punto de Venta',
  verifactu: 'VERI*FACTU',
  license: 'Licencia',
  security: 'Seguridad',
  notifications: 'Notificaciones',
  about: 'Acerca de',
};

// Etiquetas de estados de vista
export const VIEW_STATE_LABELS: Record<ViewState, string> = {
  list: 'Lista de elementos',
  detail: 'Vista de detalle',
  form: 'Formulario',
  empty: 'Vista vacía',
  panel: 'Panel de configuración',
};
