import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

type SidebarToggleButtonProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const SidebarToggleButton = ({ isSidebarOpen, toggleSidebar }: SidebarToggleButtonProps) => {
  return (
    <Button
      variant="outline"
      size="icon"
      className="absolute top-4 left-0 z-10 p-0 bg-background"
      onClick={toggleSidebar}
    >
      {isSidebarOpen ? (
        <ChevronLeftIcon className="h-12 w-12" />
      ) : (
        <ChevronRightIcon className="h-12 w-12" />
      )}
    </Button>
  );
};

export default SidebarToggleButton;
