import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import React from 'react';
import MoonSunSwitch from '@/components/MoonSunSwitch.tsx';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useResponsive } from '@/hooks/useResponsive';
import type User from '@/models/User';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

type SidebarProps = {
  isSidebarOpen: boolean;
  activeSection: string;
  setActiveSection: (section: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  menuItems: Array<{ id: string; icon: React.ReactElement; label: string }>;
  loggedUser: User | null;
  onLogout?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({
  loggedUser,
  isSidebarOpen,
  activeSection,
  setActiveSection,
  isDarkMode,
  toggleDarkMode,
  menuItems,
  onLogout,
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Hide sidebar completely on mobile (BottomNavigation handles navigation)
  if (isMobile) {
    return null;
  }
  // Adjust sidebar behavior based on screen size
  const getWidth = () => {
    if (isTablet) {
      return isSidebarOpen ? '180px' : '60px';
    }
    return isSidebarOpen ? '200px' : '80px';
  };

  const sidebarVariants = {
    open: {
      width: getWidth(),
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 30,
        duration: 0.2,
      },
    },
    closed: {
      width: getWidth(),
      opacity: isTablet ? (isSidebarOpen ? 1 : 0.95) : 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 30,
        duration: 0.2,
      },
    },
  };

  return (
    <motion.div
      initial={false}
      animate={isSidebarOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
      className="relative h-full mr-4"
    >
      <Card
        className={`h-full bg-sidebar border-sidebar-border rounded-r-3xl shadow-lg overflow-hidden ${
          isTablet ? (isSidebarOpen ? 'w-44' : 'w-14') : isSidebarOpen ? 'w-52' : 'w-20'
        }`}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <CardContent
          className="flex flex-col h-full overflow-hidden"
          style={{
            padding: isTablet ? 'calc(var(--spacing) * 1.5)' : 'calc(var(--spacing) * 2)',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              marginTop: 'calc(var(--spacing) * 4)',
              marginBottom: 'calc(var(--spacing) * 6)',
            }}
          >
            <img
              src="/logo.svg"
              alt="El Haido Logo"
              className={`${
                isSidebarOpen
                  ? isTablet
                    ? 'h-20 w-28'
                    : 'h-24 w-32'
                  : isTablet
                    ? 'h-8 w-8'
                    : 'h-10 w-10'
              } transition-all duration-200`}
            />
          </div>

          {loggedUser && (
            <div
              className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'}`}
              style={{ marginBottom: 'calc(var(--spacing) * 6)' }}
            >
              <Avatar
                className={isSidebarOpen ? 'h-8 w-8' : 'h-6 w-6'}
                style={{
                  backgroundColor: 'hsl(var(--sidebar-accent))',
                  color: 'hsl(var(--sidebar-accent-foreground))',
                }}
              >
                <AvatarImage src={loggedUser.profilePicture} alt={loggedUser.name} />
                <AvatarFallback
                  style={{
                    backgroundColor: 'hsl(var(--sidebar-accent))',
                    color: 'hsl(var(--sidebar-accent-foreground))',
                    fontSize: 'calc(var(--font-sans) * 0.875)',
                    fontWeight: '500',
                  }}
                >
                  {loggedUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p
                      className="text-xs sm:text-sm font-medium text-sidebar-foreground whitespace-nowrap"
                      style={{
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: 'var(--tracking-normal)',
                      }}
                    >
                      {loggedUser.name}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <ScrollArea className="flex-grow">
            <nav className="space-y-1 sm:space-y-2">
              {menuItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`
                                        w-full ${isSidebarOpen ? 'justify-start px-3' : 'justify-center'}
                                        h-12 sm:h-14 transition-all duration-200 ease-in-out
                                        flex items-center rounded-lg
                                        font-medium text-sm
                                        focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar
                                        ${
                                          activeSection === item.id
                                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                                            : 'bg-sidebar-accent border border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:border-sidebar-border'
                                        }
                                    `}
                  onClick={() => setActiveSection(item.id)}
                >
                  <div className="flex items-center">
                    {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, {
                      className: `${isSidebarOpen ? 'h-5 w-5 mr-3' : 'h-4 w-4'} transition-all duration-200`,
                    })}
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm sm:text-base whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              ))}
            </nav>
          </ScrollArea>

          <div className="space-y-2" style={{ marginTop: 'calc(var(--spacing) * 4)' }}>
            <div
              className="flex items-center justify-center"
              style={{ padding: 'calc(var(--spacing) * 2)' }}
            >
              <MoonSunSwitch isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} size="sm" />
            </div>

            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-center bg-sidebar-accent border border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:border-sidebar-border text-xs sm:text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar"
                    onClick={onLogout}
                    style={{
                      padding: 'calc(var(--spacing) * 2) calc(var(--spacing) * 3)',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: '500',
                    }}
                  >
                    <LogOut className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Cerrar Sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Sidebar;
