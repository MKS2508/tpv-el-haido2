import { Motion, Presence } from '@motionone/solid';
import { LogOut } from 'lucide-solid';
import { type Component, For, type JSX, Show, splitProps } from 'solid-js';

import MoonSunSwitch from '@/components/MoonSunSwitch.tsx';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type User from '@/models/User';
import { Card, CardContent } from './ui/card';

// Simple Avatar components for SolidJS (replacing Radix-based ones)
interface AvatarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
}

function Avatar(props: AvatarProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div
      class={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
}

interface AvatarImageProps extends JSX.ImgHTMLAttributes<HTMLImageElement> {}

function AvatarImage(props: AvatarImageProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <img
      alt={local.alt || ''}
      class={cn('aspect-square h-full w-full object-cover', local.class)}
      {...others}
    />
  );
}

interface AvatarFallbackProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  children?: JSX.Element;
}

function AvatarFallback(props: AvatarFallbackProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <span
      class={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        local.class
      )}
      {...others}
    >
      {local.children}
    </span>
  );
}

// Simple ScrollArea for SolidJS
interface ScrollAreaProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
}

function ScrollArea(props: ScrollAreaProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('relative overflow-auto', local.class)} {...others}>
      {local.children}
    </div>
  );
}

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
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  menuItems: MenuItem[];
  loggedUser: User | null;
  onLogout?: () => void;
};

function Sidebar(props: SidebarProps) {
  const [local] = splitProps(props, [
    'loggedUser',
    'isSidebarOpen',
    'activeSection',
    'setActiveSection',
    'isDarkMode',
    'toggleDarkMode',
    'menuItems',
    'onLogout',
  ]);

  const responsive = useResponsive();

  // Derive values from responsive state
  const isMobile = () => responsive.isMobile;
  const isTablet = () => responsive.isTablet;

  // Adjust sidebar behavior based on screen size
  const getWidth = () => {
    if (isTablet()) {
      return local.isSidebarOpen ? '180px' : '60px';
    }
    return local.isSidebarOpen ? '200px' : '80px';
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
        class="relative h-full mr-4"
      >
        <Card
          class={cn(
            'h-full bg-sidebar border-sidebar-border rounded-r-3xl shadow-lg overflow-hidden',
            isTablet()
              ? local.isSidebarOpen
                ? 'w-44'
                : 'w-14'
              : local.isSidebarOpen
                ? 'w-52'
                : 'w-20'
          )}
          style={{ 'box-shadow': 'var(--shadow-lg)' }}
        >
          <CardContent
            class="flex flex-col h-full overflow-hidden"
            style={{
              padding: isTablet() ? 'calc(var(--spacing) * 1.5)' : 'calc(var(--spacing) * 2)',
            }}
          >
            <div
              class="flex items-center justify-center"
              style={{
                'margin-top': 'calc(var(--spacing) * 4)',
                'margin-bottom': 'calc(var(--spacing) * 6)',
              }}
            >
              <img
                src="/logo.svg"
                alt="El Haido Logo"
                class={cn(
                  'transition-all duration-200',
                  local.isSidebarOpen
                    ? isTablet()
                      ? 'h-20 w-28'
                      : 'h-24 w-32'
                    : isTablet()
                      ? 'h-8 w-8'
                      : 'h-10 w-10'
                )}
              />
            </div>

            <Show when={local.loggedUser}>
              {(user) => (
                <div
                  class={cn(
                    'flex items-center',
                    local.isSidebarOpen ? 'space-x-3' : 'justify-center'
                  )}
                  style={{ 'margin-bottom': 'calc(var(--spacing) * 6)' }}
                >
                  <Avatar
                    class={local.isSidebarOpen ? 'h-8 w-8' : 'h-6 w-6'}
                    style={{
                      'background-color': 'hsl(var(--sidebar-accent))',
                      color: 'hsl(var(--sidebar-accent-foreground))',
                    }}
                  >
                    <Show
                      when={user().profilePicture}
                      fallback={
                        <AvatarFallback
                          style={{
                            'background-color': 'hsl(var(--sidebar-accent))',
                            color: 'hsl(var(--sidebar-accent-foreground))',
                            'font-size': 'calc(var(--font-sans) * 0.875)',
                            'font-weight': '500',
                          }}
                        >
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
                      >
                        <p
                          class="text-xs sm:text-sm font-medium text-sidebar-foreground whitespace-nowrap"
                          style={{
                            'font-family': 'var(--font-sans)',
                            'letter-spacing': 'var(--tracking-normal)',
                          }}
                        >
                          {user().name}
                        </p>
                      </Motion.div>
                    </Show>
                  </Presence>
                </div>
              )}
            </Show>

            <ScrollArea class="flex-grow">
              <nav class="space-y-2 sm:space-y-3">
                <For each={local.menuItems}>
                  {(item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        type="button"
                        class={cn(
                          'w-full h-12 sm:h-14 transition-all duration-200 ease-in-out',
                          'flex items-center rounded-lg',
                          'font-medium text-sm',
                          'focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar',
                          local.isSidebarOpen ? 'justify-start px-3' : 'justify-center',
                          local.activeSection === item.id
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                            : 'bg-sidebar-accent border border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:border-sidebar-border'
                        )}
                        onClick={() => local.setActiveSection(item.id)}
                      >
                        <div class="flex items-center">
                          <IconComponent
                            class={cn(
                              'transition-all duration-200',
                              local.isSidebarOpen ? 'h-5 w-5 mr-3' : 'h-4 w-4'
                            )}
                          />
                          <Presence>
                            <Show when={local.isSidebarOpen}>
                              <Motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                class="text-sm sm:text-base whitespace-nowrap"
                              >
                                {item.label}
                              </Motion.span>
                            </Show>
                          </Presence>
                        </div>
                      </button>
                    );
                  }}
                </For>
              </nav>
            </ScrollArea>

            <div class="space-y-2" style={{ 'margin-top': 'calc(var(--spacing) * 4)' }}>
              <div
                class="flex items-center justify-center"
                style={{ padding: 'calc(var(--spacing) * 2)' }}
              >
                <MoonSunSwitch
                  isDarkMode={local.isDarkMode}
                  toggleDarkMode={local.toggleDarkMode}
                  size="sm"
                />
              </div>

              <Presence>
                <Show when={local.isSidebarOpen}>
                  <Motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      type="button"
                      class="w-full flex items-center justify-center bg-sidebar-accent border border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:border-sidebar-border text-xs sm:text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar"
                      onClick={() => local.onLogout()}
                      style={{
                        padding: 'calc(var(--spacing) * 2) calc(var(--spacing) * 3)',
                        'font-family': 'var(--font-sans)',
                        'font-weight': '500',
                      }}
                    >
                      <LogOut class="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
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
