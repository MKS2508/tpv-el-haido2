import { motion } from 'framer-motion';
import type React from 'react';
import { cn } from '@/lib/utils';
import type User from '@/models/User';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavigationProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  menuItems: MenuItem[];
  loggedUser: User | null;
  onLogout: () => void;
  className?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeSection,
  setActiveSection,
  menuItems,
  loggedUser,
  onLogout,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border',
        className
      )}
    >
      <div className="flex w-full items-center justify-evenly px-2 py-2 safe-area-bottom">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[60px] px-3 py-2 rounded-xl transition-all duration-200',
                'touch-manipulation select-none',
                'active:scale-95 hover:bg-accent/10',
                isActive
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              whileTap={{
                scale: 0.9,
                transition: { duration: 0.1 },
              }}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
              initial={{ scale: 1 }}
              animate={{ scale: 1 }}
              aria-label={item.label}
            >
              {/* Background indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavActiveTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    type: 'spring',
                    bounce: 0.3,
                    duration: 0.5,
                  }}
                />
              )}

              {/* Icon */}
              <div className="relative z-10">
                <motion.div
                  className="w-6 h-6 flex items-center justify-center"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    rotate: isActive ? [0, -5, 5, 0] : 0,
                  }}
                  transition={{
                    duration: isActive ? 0.6 : 0.2,
                    type: 'spring',
                    bounce: 0.4,
                  }}
                >
                  {item.icon}
                </motion.div>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full shadow-lg"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 1.3, 1],
                      opacity: 1,
                    }}
                    transition={{
                      duration: 0.5,
                      times: [0, 0.6, 1],
                      type: 'spring',
                      bounce: 0.6,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <motion.span
                className={cn(
                  'text-xs font-medium mt-1 transition-opacity z-10',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}
                animate={{
                  y: isActive ? -1 : 0,
                  fontWeight: isActive ? 600 : 500,
                }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.span>
            </motion.button>
          );
        })}

        {/* User menu */}
        <motion.button
          onClick={onLogout}
          className="relative flex flex-col items-center justify-center min-h-[60px] px-3 py-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-destructive/5 touch-manipulation select-none"
          whileTap={{
            scale: 0.9,
            transition: { duration: 0.1 },
          }}
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.2 },
          }}
          aria-label="Cerrar sesión"
        >
          {/* User avatar */}
          <div className="relative z-10">
            <motion.div
              className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30"
              whileHover={{
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                borderColor: 'hsl(var(--destructive) / 0.3)',
              }}
              transition={{ duration: 0.2 }}
            >
              <motion.span
                className="text-xs font-semibold text-primary"
                whileHover={{ color: 'hsl(var(--destructive))' }}
                transition={{ duration: 0.2 }}
              >
                {loggedUser?.name?.charAt(0) || 'U'}
              </motion.span>
            </motion.div>
          </div>

          {/* Label */}
          <motion.span
            className="text-xs font-medium mt-1 opacity-70 z-10"
            whileHover={{
              opacity: 1,
              color: 'hsl(var(--destructive))',
            }}
            transition={{ duration: 0.2 }}
          >
            Salir
          </motion.span>
        </motion.button>
      </div>

      {/* Safe area bottom padding for devices with home indicator */}
      <div className="h-safe-area-bottom" />
    </div>
  );
};

export default BottomNavigation;
