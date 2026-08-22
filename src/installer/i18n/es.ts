// Strings del wizard en español.
// TR-19.A: solo Welcome step. TR-19.C expandió a los 7 steps completos.
// Mantener `as const` para narrowing de tipos en componentes SolidJS.

export const es = {
  welcome: {
    title: 'Instalar TPV El Haido',
    description: 'Esta aplicación le guiará en la instalación de TPV El Haido en su sistema.',
    cancel: 'Cancelar',
    next: 'Siguiente',
  },
  download: {
    title: 'Descargar TPV El Haido',
    heading: 'Última versión disponible',
    description:
      'Se descargará la versión más reciente del TPV desde el servidor de releases. La suma de verificación SHA256 se valida tras la descarga.',
    start: 'Iniciar descarga',
    downloading: 'Descargando…',
    verifying: 'Verificando integridad…',
    retry: 'Reintentar',
    errorTitle: 'Error de descarga',
  },
  path: {
    title: 'Ruta de instalación',
    heading: '¿Dónde instalar el binario?',
    description:
      'Por defecto se instala en ~/.local/bin siguiendo el estándar XDG Base Directory. No requiere permisos de administrador.',
    defaultPath: '~/.local/bin (recomendado)',
    customPath: 'Ruta personalizada',
    customPathPlaceholder: '/home/usuario/apps/tpv-el-haido',
    xdgExplanation:
      'XDG Base Directory: ~/.local/bin para binarios, ~/.local/share/applications para .desktop, ~/.local/share/icons para iconos.',
  },
  components: {
    title: 'Componentes opcionales',
    heading: 'Selecciona qué componentes instalar',
    description:
      'Estos componentes mejoran la integración con tu escritorio. Todos están activados por defecto.',
    desktopEntry: 'Crear entrada .desktop (aparece en el menú de aplicaciones)',
    icon: 'Instalar icono en ~/.local/share/icons',
    addToPath: 'Añadir ~/.local/bin al PATH si no está',
  },
  review: {
    title: 'Revisar configuración',
    heading: 'Resumen de la instalación',
    description: 'Verifica los ajustes antes de instalar. Puedes volver atrás para modificar.',
    summaryPath: 'Ruta de instalación',
    summaryDesktop: 'Entrada .desktop',
    summaryIcon: 'Icono',
    summaryPathSymlink: 'Symlink en PATH',
    summaryLanguage: 'Idioma',
    yes: 'Sí',
    no: 'No',
    back: 'Atrás',
    install: 'Instalar',
  },
  install: {
    title: 'Instalando…',
    preparing: 'Preparando instalación…',
    cancel: 'Cancelar instalación',
    errorTitle: 'Error durante la instalación',
  },
  done: {
    title: 'Instalación completa',
    successMessage:
      'TPV El Haido se ha instalado correctamente en tu sistema. Puedes abrirlo desde el menú de aplicaciones o usando el comando del terminal.',
    launch: 'Abrir TPV',
    close: 'Cerrar',
  },
  app: {
    name: 'TPV El Haido',
    version: 'Versión',
  },
  common: {
    back: 'Atrás',
    next: 'Siguiente',
  },
} as const;

/**
 * Tipo público del shape de strings del wizard.
 * Estructural (no anchored a literales de `es`) — así `en` (con sus propios
 * literales) puede satisfacerla sin que TS se queje en la asignación
 * `t: InstallerStrings = props.language === 'en' ? en : es`.
 * Cada locale mantiene `as const` internamente para narrowing cuando aplica.
 */
export interface InstallerStrings {
  welcome: {
    title: string;
    description: string;
    cancel: string;
    next: string;
  };
  download: {
    title: string;
    heading: string;
    description: string;
    start: string;
    downloading: string;
    verifying: string;
    retry: string;
    errorTitle: string;
  };
  path: {
    title: string;
    heading: string;
    description: string;
    defaultPath: string;
    customPath: string;
    customPathPlaceholder: string;
    xdgExplanation: string;
  };
  components: {
    title: string;
    heading: string;
    description: string;
    desktopEntry: string;
    icon: string;
    addToPath: string;
  };
  review: {
    title: string;
    heading: string;
    description: string;
    summaryPath: string;
    summaryDesktop: string;
    summaryIcon: string;
    summaryPathSymlink: string;
    summaryLanguage: string;
    yes: string;
    no: string;
    back: string;
    install: string;
  };
  install: {
    title: string;
    preparing: string;
    cancel: string;
    errorTitle: string;
  };
  done: {
    title: string;
    successMessage: string;
    launch: string;
    close: string;
  };
  app: {
    name: string;
    version: string;
  };
  common: {
    back: string;
    next: string;
  };
}
