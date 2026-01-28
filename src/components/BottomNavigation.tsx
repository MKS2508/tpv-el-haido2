import { Component, For, Show, splitProps } from 'solid-js';
import { Motion } from '@motionone/solid';
import { cn } from '@/lib/utils';
import type User from '@/models/User';

interface MenuItem {
  id: string;
  label: string;
  icon: Component;
}

interface BottomNavigationProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  menuItems: MenuItem[];
  loggedUser: User | null;
  onLogout: () => void;
  class?: string;
}

function BottomNavigation(props: BottomNavigationProps) {
  const [local, others] = splitProps(props, [
    'activeSection',
    'setActiveSection',
    'menuItems',
    'loggedUser',
    'onLogout',
    'class',
  ]);

  return (
    <div
      class={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border',
        local.class
      )}
      {...others}
    >
      <div class="flex w-full items-center justify-evenly px-2 py-2 safe-area-bottom">
        <For each={local.menuItems}>
          {(item) => {
            const isActive = () => local.activeSection === item.id;
            const IconComponent = item.icon;

            return (
              <Motion.button
                onClick={() => local.setActiveSection(item.id)}
                class={cn(
                  'relative flex flex-col items-center justify-center min-h-[60px] px-3 py-2 rounded-xl transition-all duration-200',
                  'touch-manipulation select-none',
                  'active:scale-95 hover:bg-accent/10',
                  isActive()
                    ? 'text-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                press={{
                  scale: 0.9,
                  easing: 'ease-out',
                }}
                hover={{
                  scale: 1.05,
                  easing: 'ease-out',
                }}
                aria-label={item.label}
              >
                {/* Background indicator */}
                <Show when={isActive()}>
                  <Motion.div
                    class="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      duration: 0.5,
                      easing: [0.175, 0.885, 0.32, 1.275],
                    }}
                  />
                </Show>
                {/* Icon */}
                <div class="relative z-10">
                  <Motion.div
                    class="w-6 h-6 flex items-center justify-center"
                    animate={{
                      scale: isActive() ? 1.1 : 1,
                      rotate: isActive() ? '0deg' : '0deg',
                    }}
                    transition={{
                      duration: isActive() ? 0.6 : 0.2,
                      easing: [0.175, 0.885, 0.32, 1.275],
                    }}
                  >
                    <IconComponent />
                  </Motion.div>

                  {/* Active indicator dot */}
                  <Show when={isActive()}>
                    <Motion.div
                      class="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full shadow-lg"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                      }}
                      transition={{
                        duration: 0.5,
                        easing: [0.175, 0.885, 0.32, 1.275],
                      }}
                    />
                  </Show>
                </div>
                {/* Label */}
                <Motion.span
                  class={cn(
                    'text-xs font-medium mt-1 transition-opacity z-10',
                    isActive() ? 'opacity-100' : 'opacity-70'
                  )}
                  animate={{
                    y: isActive() ? -1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </Motion.span>
              </Motion.button>
            );
          }}
        </For>

        {/* User menu */}
        <Motion.button
          onClick={local.onLogout}
          class="relative flex flex-col items-center justify-center min-h-[60px] px-3 py-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-destructive/5 touch-manipulation select-none"
          press={{
            scale: 0.9,
            easing: 'ease-out',
          }}
          hover={{
            scale: 1.05,
            easing: 'ease-out',
          }}
          aria-label="Cerrar sesion"
        >
          {/* User avatar */}
          <div class="relative z-10">
            <Motion.div
              class="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30"
              hover={{
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                borderColor: 'hsl(var(--destructive) / 0.3)',
              }}
              transition={{ duration: 0.2 }}
            >
              <Motion.span
                class="text-xs font-semibold text-primary"
                hover={{ color: 'hsl(var(--destructive))' }}
                transition={{ duration: 0.2 }}
              >
                {local.loggedUser?.name?.charAt(0) || 'U'}
              </Motion.span>
            </Motion.div>
          </div>

          {/* Label */}
          <Motion.span
            class="text-xs font-medium mt-1 opacity-70 z-10"
            hover={{
              opacity: 1,
              color: 'hsl(var(--destructive))',
            }}
            transition={{ duration: 0.2 }}
          >
            Salir
          </Motion.span>
        </Motion.button>
      </div>
      {/* Safe area bottom padding for devices with home indicator */}
      <div class="h-safe-area-bottom" />
    </div>
  );
}

export default BottomNavigation;
