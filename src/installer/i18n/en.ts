// Strings del wizard en inglés.
// TR-19.A: solo Welcome step. TR-19.C expandirá a los 7 steps completos.
// Mantener `as const` para narrowing de tipos en componentes SolidJS.
// Debe espejar la shape de `es` (ver `InstallerStrings` en es.ts).

import type { InstallerStrings } from './es';

export const en = {
  welcome: {
    title: 'Install TPV El Haido',
    description: 'This wizard will guide you through installing TPV El Haido on your system.',
    cancel: 'Cancel',
    next: 'Next',
  },
  app: {
    name: 'TPV El Haido',
    version: 'Version',
  },
} as const satisfies InstallerStrings;
