import { Show, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { getBusinessNif } from '@/store/store';

interface MenuItem {
  id: string;
  icon: any;
  label: string;
}

interface SectionHeaderProps {
  menuItems: MenuItem[];
  activeSection: string;
}

/**
 * Obtiene la razón social del negocio desde la configuración AEAT en localStorage.
 * @returns Razón social o cadena vacía
 */
const getBusinessName = (): string => {
  try {
    const saved = localStorage.getItem('tpv-aeat-config');
    if (saved) {
      const aeatConfig = JSON.parse(saved);
      return aeatConfig?.businessData?.nombreRazon ?? '';
    }
  } catch {
    // Ignore parse errors
  }
  return '';
};

function SectionHeader(props: SectionHeaderProps) {
  const [local] = splitProps(props, ['menuItems', 'activeSection']);

  const activeItem = () => local.menuItems.find((item) => item.id === local.activeSection);
  const businessName = () => getBusinessName();
  const businessNif = () => getBusinessNif();

  return (
    <Show when={activeItem()}>
      {(item) => {
        return (
          <div class="mb-3 flex items-center justify-between">
            <h1 class="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Dynamic component={item().icon} class="h-5 w-5" />
              <span>{item().label}</span>
            </h1>
            <Show when={businessName() || businessNif()}>
              <div class="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 border border-border/50">
                <span class="font-medium text-foreground/80">El Haido</span>
                <span class="text-border">·</span>
                <Show when={businessName()}>
                  <span>{businessName()}</span>
                  <span class="text-border">·</span>
                </Show>
                <Show when={businessNif()}>
                  <span>NIF {businessNif()}</span>
                </Show>
              </div>
            </Show>
          </div>
        );
      }}
    </Show>
  );
}

export default SectionHeader;
