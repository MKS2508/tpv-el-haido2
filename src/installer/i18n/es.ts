// Strings del wizard en español.
// TR-19.A: solo Welcome step. TR-19.C expandirá a los 7 steps completos.
// Mantener `as const` para narrowing de tipos en componentes SolidJS.

export const es = {
  welcome: {
    title: 'Instalar TPV El Haido',
    description: 'Esta aplicación le guiará en la instalación de TPV El Haido en su sistema.',
    cancel: 'Cancelar',
    next: 'Siguiente',
  },
  app: {
    name: 'TPV El Haido',
    version: 'Versión',
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
  app: {
    name: string;
    version: string;
  };
}
