import { type Component, Show, splitProps } from 'solid-js';

interface MenuItem {
  id: string;
  icon: Component<any>;
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
        const IconComponent = item().icon;
        return (
          <h1 class="text-3xl font-bold mb-6 flex items-center">
            <IconComponent />
            <span class="ml-2">{item().label}</span>
          </h1>
        );
      }}
    </Show>
  );
}

export default SectionHeader;
