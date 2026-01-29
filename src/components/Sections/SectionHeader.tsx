import type { JSX } from 'solid-js';
import { Show, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

interface MenuItem {
  id: string;
  icon: any;
  label: string;
}

interface SectionHeaderProps {
  menuItems: MenuItem[];
  activeSection: string;
}

function SectionHeader(props: SectionHeaderProps) {
  const [local] = splitProps(props, ['menuItems', 'activeSection']);

  const activeItem = () => local.menuItems.find((item) => item.id === local.activeSection);

  return (
    <Show when={activeItem()}>
      {(item) => {
        return (
          <h1 class="text-3xl font-bold mb-6 flex items-center">
            <Dynamic component={item().icon} />
            <span class="ml-2">{item().label}</span>
          </h1>
        );
      }}
    </Show>
  );
}

export default SectionHeader;
