import { useEffect } from 'react'
import { isTauriEnvironment } from '@/utils/environment'

interface UseDocumentTitleOptions {
  suffix?: string
  prefix?: string
}

/**
 * Hook para actualizar el título del documento dinámicamente
 * Funciona tanto en entorno web como en Tauri
 */
export function useDocumentTitle(
  title: string, 
  options: UseDocumentTitleOptions = {}
) {
  const { suffix = '', prefix = 'El Haido TPV' } = options

  useEffect(() => {
    const prevTitle = document.title
    
    // Construir el nuevo título
    let newTitle = prefix
    if (title) {
      newTitle += ` - ${title}`
    }
    if (suffix) {
      newTitle += ` ${suffix}`
    }

    // Actualizar título del documento
    document.title = newTitle

    // Intentar actualizar título de ventana Tauri si está disponible
    if (isTauriEnvironment()) {
      try {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          const appWindow = getCurrentWindow();
          appWindow.setTitle(newTitle).catch(() => {
            // Silently fail si no se puede actualizar el título de Tauri
          })
        }).catch(() => {
          // Silently fail si Tauri no está disponible
        })
      } catch {
        // Silently fail si hay algún error
      }
    }

    // Cleanup function para restaurar título anterior si es necesario
    return () => {
      // Solo restaurar si el título actual aún es el que establecimos
      if (document.title === newTitle) {
        document.title = prevTitle
      }
    }
  }, [title, prefix, suffix])
}

/**
 * Mapeo de secciones a títulos legibles
 */
export const SECTION_TITLES = {
  home: 'Inicio',
  products: 'Productos',
  newOrder: 'Nueva Comanda',
  orderHistory: 'Historial de Pedidos',
  settings: 'Configuración'
} as const

export type SectionKey = keyof typeof SECTION_TITLES

/**
 * Hook conveniente para secciones predefinidas
 */
export function useSectionTitle(section: SectionKey | string) {
  const title = SECTION_TITLES[section as SectionKey] || section
  useDocumentTitle(title)
}