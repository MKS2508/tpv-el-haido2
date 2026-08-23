import { Motion, Presence } from '@motionone/solid';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-solid';
import { type Component, For, Show, splitProps } from 'solid-js';

import MoonSunSwitch from '@/components/MoonSunSwitch.tsx';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type User from '@/models/User';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent } from './ui/card';

// MenuItem with icon as Component type (function) instead of ReactElement
type MenuItem = {
  id: string;
  icon: Component<{ class?: string }>;
  label: string;
};

type SidebarProps = {
  isSidebarOpen: boolean;
  activeSection: string;
  setActiveSection: (section: string) => void;
  menuItems: MenuItem[];
  loggedUser: User | null;
  onLogout?: () => void;
  toggleSidebar?: () => void;
};

function Sidebar(props: SidebarProps) {
  const [local] = splitProps(props, [
    'loggedUser',
    'isSidebarOpen',
    'activeSection',
    'setActiveSection',
    'menuItems',
    'onLogout',
    'toggleSidebar',
  ]);

  const responsive = useResponsive();

  // Derive values from responsive state (call the accessors)
  const isMobile = () => responsive.isMobile();
  const isTablet = () => responsive.isTablet();

  // Adjust sidebar behavior based on screen size
  const getWidth = () => {
    if (isTablet()) {
      return local.isSidebarOpen ? '200px' : '60px';
    }
    return local.isSidebarOpen ? '224px' : '64px';
  };

  const getOpacity = () => {
    return isTablet() ? (local.isSidebarOpen ? 1 : 0.95) : 1;
  };

  return (
    <Show when={!isMobile()}>
      <Motion.div
        initial={{ opacity: 1 }}
        animate={{
          width: getWidth(),
          opacity: getOpacity(),
          x: 0,
        }}
        transition={{
          duration: 0.2,
          easing: 'ease-out',
        }}
        class="relative h-full mr-3"
      >
        <Card
          class={cn(
            'isolate h-full border border-foreground/10 rounded-2xl overflow-hidden backdrop-blur-xl',
            'bg-[color-mix(in_oklch,var(--sidebar)_85%,var(--foreground)_15%)]',
            isTablet()
              ? local.isSidebarOpen
                ? 'w-[200px]'
                : 'w-[60px]'
              : local.isSidebarOpen
                ? 'w-56'
                : 'w-16'
          )}
        >
          <CardContent class="flex flex-col h-full overflow-hidden p-0">
            {/* Logo + business info */}
            <div class="flex flex-col items-center flex-shrink-0 py-4 gap-1">
              <img
                src="/logo.svg"
                alt="El Haido Logo"
                class={cn(
                  'transition-[height,width] duration-200',
                  local.isSidebarOpen ? (isTablet() ? 'h-14 w-20' : 'h-16 w-24') : 'h-8 w-8'
                )}
              />
              <Presence>
                <Show when={local.isSidebarOpen}>
                  <Motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    class="text-center"
                  >
                    <p class="text-xs text-sidebar-foreground/50 leading-tight">
                      GERMAN ASENSIO BLASCO
                    </p>
                    <p class="text-xs text-sidebar-foreground/40 leading-tight">NIF 16639695T</p>
                  </Motion.div>
                </Show>
              </Presence>
            </div>

            {/* User chip */}
            <Show when={local.loggedUser}>
              {(user) => (
                <div
                  class={cn(
                    'flex items-center flex-shrink-0 mx-3 mb-3 px-3 py-2.5 rounded-xl',
                    'bg-foreground/5 border border-foreground/10',
                    local.isSidebarOpen ? 'gap-3' : 'justify-center'
                  )}
                >
                  <Avatar class="h-8 w-8 flex-shrink-0">
                    <Show
                      when={user().profilePicture}
                      fallback={
                        <AvatarFallback class="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
                          {user().name.charAt(0)}
                        </AvatarFallback>
                      }
                    >
                      <AvatarImage src={user().profilePicture} alt={user().name} />
                    </Show>
                  </Avatar>
                  <Presence>
                    <Show when={local.isSidebarOpen}>
                      <Motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        class="min-w-0"
                      >
                        <p class="text-sm font-semibold text-sidebar-foreground truncate">
                          {user().name}
                        </p>
                      </Motion.div>
                    </Show>
                  </Presence>
                </div>
              )}
            </Show>

            {/* Navigation — items grow to fill available height */}
            <nav class="flex-1 min-h-0 flex flex-col gap-1.5 px-3 py-3 overflow-y-auto">
              <For each={local.menuItems}>
                {(item) => {
                  const IconComponent = item.icon;
                  const isActive = () => local.activeSection === item.id;
                  return (
                    <button
                      type="button"
                      class={cn(
                        'w-full flex-1 transition-[background-color,padding] duration-150',
                        'flex items-center rounded-xl',
                        'font-medium text-[15px]',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                        'min-h-[48px] max-h-[72px]',
                        local.isSidebarOpen ? 'justify-start px-4 gap-3' : 'justify-center px-2',
                        isActive()
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                          : 'bg-foreground/5 text-sidebar-foreground hover:bg-foreground/10'
                      )}
                      onClick={() => local.setActiveSection(item.id)}
                    >
                      <IconComponent class="flex-shrink-0 h-5 w-5" />
                      <Presence>
                        <Show when={local.isSidebarOpen}>
                          <Motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            class="text-left leading-tight"
                          >
                            {item.label}
                          </Motion.span>
                        </Show>
                      </Presence>
                    </button>
                  );
                }}
              </For>
            </nav>

            {/* Footer — theme, logout, collapse */}
            <div class="flex-shrink-0 px-3 pb-3 pt-2 border-t border-foreground/10 space-y-2">
              {/* Theme switch + collapse toggle */}
              <div
                class={cn(
                  'flex items-center py-1',
                  local.isSidebarOpen ? 'justify-between px-1' : 'justify-center'
                )}
              >
                <MoonSunSwitch size="sm" />
                <Show when={local.toggleSidebar}>
                  <button
                    type="button"
                    class="flex items-center justify-center h-8 w-8 rounded-lg text-sidebar-foreground hover:bg-foreground/10 transition-colors"
                    onClick={() => local.toggleSidebar?.()}
                  >
                    {local.isSidebarOpen ? (
                      <ChevronLeft class="h-4 w-4" />
                    ) : (
                      <ChevronRight class="h-4 w-4" />
                    )}
                  </button>
                </Show>
              </div>

              <Presence>
                <Show when={local.isSidebarOpen}>
                  <Motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      type="button"
                      class="w-full flex items-center justify-center gap-2.5 text-sidebar-foreground hover:bg-foreground/10 text-sm font-medium rounded-xl min-h-[44px] py-2.5 px-3 bg-foreground/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      onClick={() => local.onLogout?.()}
                    >
                      <LogOut class="h-4 w-4" />
                      Cerrar Sesion
                    </button>
                  </Motion.div>
                </Show>
              </Presence>
            </div>
          </CardContent>
        </Card>
      </Motion.div>
    </Show>
  );
}

export default Sidebar;
export type { MenuItem, SidebarProps };
