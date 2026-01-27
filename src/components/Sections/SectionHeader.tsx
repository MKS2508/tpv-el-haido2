import type React from 'react';

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface SectionHeaderProps {
  menuItems: MenuItem[];
  activeSection: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ menuItems, activeSection }) => {
  const activeItem = menuItems.find((item) => item.id === activeSection);

  if (!activeItem) return null; // Evita el renderizado si no hay un ítem activo

  return (
    <h1 className="text-3xl font-bold mb-6 flex items-center">
      {activeItem.icon}
      <span className="ml-2">{activeItem.label}</span>
    </h1>
  );
};

export default SectionHeader;
