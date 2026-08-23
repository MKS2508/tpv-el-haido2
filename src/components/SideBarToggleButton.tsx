import { Motion } from '@motionone/solid';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-solid';
import { type Component, splitProps } from 'solid-js';

type SidebarToggleButtonProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const SidebarToggleButton: Component<SidebarToggleButtonProps> = (props) => {
  const [local] = splitProps(props, ['isSidebarOpen', 'toggleSidebar']);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      class="absolute top-1/2 -translate-y-1/2 z-20"
      style={{ left: '-14px' }}
    >
      <button
        type="button"
        class="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:shadow-xl hover:scale-110 transition-[transform,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={local.toggleSidebar}
        aria-label={local.isSidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
      >
        {local.isSidebarOpen ? (
          <ChevronLeftIcon class="h-4 w-4" />
        ) : (
          <ChevronRightIcon class="h-4 w-4" />
        )}
      </button>
    </Motion.div>
  );
};

export default SidebarToggleButton;
