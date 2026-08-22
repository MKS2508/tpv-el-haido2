// Strings del wizard en inglés.
// TR-19.A: solo Welcome step. TR-19.C expandió a los 7 steps completos.
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
  download: {
    title: 'Download TPV El Haido',
    heading: 'Latest version available',
    description:
      'The latest version of TPV will be downloaded from the release server. The SHA256 checksum is validated after download.',
    start: 'Start download',
    downloading: 'Downloading…',
    verifying: 'Verifying integrity…',
    retry: 'Retry',
    errorTitle: 'Download error',
  },
  path: {
    title: 'Installation path',
    heading: 'Where should the binary be installed?',
    description:
      'By default it installs to ~/.local/bin following the XDG Base Directory standard. No administrator privileges required.',
    defaultPath: '~/.local/bin (recommended)',
    customPath: 'Custom path',
    customPathPlaceholder: '/home/user/apps/tpv-el-haido',
    xdgExplanation:
      'XDG Base Directory: ~/.local/bin for binaries, ~/.local/share/applications for .desktop, ~/.local/share/icons for icons.',
  },
  components: {
    title: 'Optional components',
    heading: 'Select which components to install',
    description: 'These components improve desktop integration. All are enabled by default.',
    desktopEntry: 'Create .desktop entry (shows up in the applications menu)',
    icon: 'Install icon at ~/.local/share/icons',
    addToPath: 'Add ~/.local/bin to PATH if not present',
  },
  review: {
    title: 'Review configuration',
    heading: 'Installation summary',
    description: 'Verify the settings before installing. You can go back to modify them.',
    summaryPath: 'Installation path',
    summaryDesktop: '.desktop entry',
    summaryIcon: 'Icon',
    summaryPathSymlink: 'PATH symlink',
    summaryLanguage: 'Language',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    install: 'Install',
  },
  install: {
    title: 'Installing…',
    preparing: 'Preparing installation…',
    cancel: 'Cancel installation',
    errorTitle: 'Installation error',
  },
  done: {
    title: 'Installation complete',
    successMessage:
      'TPV El Haido has been installed successfully on your system. You can open it from the applications menu or by using the terminal command.',
    launch: 'Open TPV',
    close: 'Close',
  },
  app: {
    name: 'TPV El Haido',
    version: 'Version',
  },
  common: {
    back: 'Back',
    next: 'Next',
  },
} as const satisfies InstallerStrings;
