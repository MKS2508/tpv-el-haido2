import { Motion } from '@motionone/solid';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-solid';
import { type Component, splitProps } from 'solid-js';
import { Button } from '@/components/ui/button.tsx';

type SidebarToggleButtonProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const SidebarToggleButton: Component<SidebarToggleButtonProps> = (props) => {
  const [local] = splitProps(props, ['isSidebarOpen', 'toggleSidebar']);

  return (
    <Motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Button
        variant="outline"
        size="icon"
        class="absolute top-4 left-0 z-10 p-0 bg-background"
        onClick={local.toggleSidebar}
      >
        {local.isSidebarOpen ? (
          <ChevronLeftIcon class="h-12 w-12" />
        ) : (
          <ChevronRightIcon class="h-12 w-12" />
        )}
      </Button>
    </Motion.div>
  );
};

export default SidebarToggleButton;
