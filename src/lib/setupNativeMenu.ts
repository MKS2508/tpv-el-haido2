import { emit } from '@tauri-apps/api/event';
import { Menu, MenuItem, Submenu } from '@tauri-apps/api/menu';
import { createContextLogger } from '@/lib/logger';

const log = createContextLogger('NativeMenu');

export async function setupNativeMenu() {
  try {
    // Crear submenu "About" (en macOS, el primer submenu se coloca bajo el menú de la app)
    const aboutSubmenu = await Submenu.new({
      text: 'About',
      items: [
        await MenuItem.new({
          id: 'about',
          text: 'Acerca de TPV El Haido',
          action: () => {
            emit('open-about-dialog');
          },
        }),
      ],
    });

    // Crear submenu "Ayuda" para Windows/Linux
    const helpSubmenu = await Submenu.new({
      text: 'Ayuda',
      items: [
        await MenuItem.new({
          id: 'about',
          text: 'Acerca de TPV El Haido',
          action: () => {
            emit('open-about-dialog');
          },
        }),
      ],
    });

    // Crear el menú principal con ambos submenús
    const menu = await Menu.new({
      items: [aboutSubmenu, helpSubmenu],
    });

    // Establecer como menú de la aplicación
    await menu.setAsAppMenu();

    log.info('✅ Native menu setup complete');
  } catch (error) {
    log.error('❌ Failed to setup native menu:', error instanceof Error ? error : undefined);
  }
}
