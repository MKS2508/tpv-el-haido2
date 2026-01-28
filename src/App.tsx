import './App.css';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BeerIcon,
  ClipboardListIcon,
  HistoryIcon,
  HomeIcon,
  PlusCircleIcon,
  ReceiptIcon,
  SettingsIcon,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import fallbackProducts from '@/assets/products.json';
import BottomNavigation from '@/components/BottomNavigation.tsx';
import DebugIndicator from '@/components/DebugIndicator.tsx';
import ErrorBoundary from '@/components/ErrorBoundary.tsx';
import AEATInvoices from '@/components/Sections/AEATInvoices.tsx';
import Home from '@/components/Sections/Home.tsx';
import Login from '@/components/Sections/Login.tsx';
import NewOrder from '@/components/Sections/NewOrder.tsx';
import OrderHistory from '@/components/Sections/OrderHistory.tsx';
import Products from '@/components/Sections/Products.tsx';
import SectionHeader from '@/components/Sections/SectionHeader.tsx';
import SettingsPanel from '@/components/Sections/SettingsPanel.tsx';
import Sidebar from '@/components/SideBar.tsx';
import SidebarToggleButton from '@/components/SideBarToggleButton.tsx';
import UpdateChecker from '@/components/UpdateChecker.tsx';
import { Onboarding } from '@/components/Onboarding';
import { useOnboardingContext } from '@/components/Onboarding/OnboardingProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster.tsx';
import { useSectionTitle } from '@/hooks/useDocumentTitle';
import { usePerformanceConfig } from '@/hooks/usePerformanceConfig';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@mks2508/theme-manager-react';
import { cn } from '@/lib/utils';
import type Product from '@/models/Product.ts';
import {
  BreakLine,
  CharacterSet,
  PrinterTypes,
  type ThermalPrinterServiceOptions,
} from '@/models/ThermalPrinter.ts';
import { useAppData } from '@/store/selectors';

function App() {
  const {
    users,
    selectedUser,
    selectedOrder,
    thermalPrinterOptions,
    tables,
    categories,
    products,
    touchOptimizationsEnabled,
    debugMode,
    storageAdapter,
    setBackendConnected,

    setUsers,
    setSelectedUser,
    setSelectedOrder,
    setSelectedOrderId,
    setThermalPrinterOptions,
    setTables,
    setCategories,
    setProducts,

    setOrderHistory,
  } = useAppData();

  const { shouldShow } = useOnboardingContext();

  // Use the perfect new theme system
  const { currentMode, setTheme, currentTheme } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const performanceConfig = usePerformanceConfig();

  const [activeSection, setActiveSection] = React.useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile && !isTablet); // Start closed on mobile/tablet
  const prevSectionRef = useRef('home');

  // Update document title based on active section
  useSectionTitle(activeSection);

  const toggleDarkMode = () => {
    setTheme(currentTheme, currentMode === 'dark' ? 'light' : 'dark');
  };

  const handleThermalPrinterOptionsChange = (options: ThermalPrinterServiceOptions | null) => {
    setThermalPrinterOptions(options);
  };

  // Helper function to get fallback products when backend is unavailable
  const getFallbackProducts = (): Product[] => {
    console.log('[App] Loading fallback products from products.json');
    const productsWithIcons = fallbackProducts.map((product) => ({
      ...product,
      icon: React.createElement(
        iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon
      ),
    }));
    console.log(`[App] Loaded ${productsWithIcons.length} fallback products`);
    return productsWithIcons;
  };

  // Helper function to get fallback categories from products
  const getFallbackCategories = () => {
    console.log('[App] Extracting fallback categories from products.json');
    const uniqueCategories = [...new Set(fallbackProducts.map((product) => product.category))].filter(Boolean);
    return uniqueCategories.map((categoryName, index) => ({
      id: index + 1,
      name: categoryName,
      description: `Categoria ${categoryName}`,
      icon: undefined,
    }));
  };

  // Apply performance-based CSS classes to root element
  useEffect(() => {
    const root = document.documentElement;

    // Remove existing performance classes
    root.classList.remove(
      'low-performance',
      'very-low-performance',
      'reduced-motion',
      'animations-disabled'
    );

    // Apply new classes based on performance config
    if (performanceConfig.isVeryLowPerformance) {
      root.classList.add('very-low-performance');
    }
    if (performanceConfig.isLowPerformance) {
      root.classList.add('low-performance');
    }
    if (performanceConfig.reduceMotion) {
      root.classList.add('reduced-motion');
    }
    if (!performanceConfig.enableAnimations) {
      root.classList.add('animations-disabled');
    }

    // Set CSS custom properties for animation durations
    root.style.setProperty('--animation-duration', `${performanceConfig.animationDuration}s`);
    root.style.setProperty('--transition-duration', `${performanceConfig.transitionDuration}s`);

    console.log('[Performance] Config applied:', {
      isLowPerformance: performanceConfig.isLowPerformance,
      isVeryLowPerformance: performanceConfig.isVeryLowPerformance,
      enableAnimations: performanceConfig.enableAnimations,
      animationDuration: performanceConfig.animationDuration,
    });
  }, [performanceConfig]);

  // Initialize state if it's empty
  useEffect(() => {
    const initializeCategories = async () => {
      if (categories.length === 0) {
        const result = await storageAdapter.getCategories();

        if (result.ok && result.value.length > 0) {
          setCategories(result.value);
          setBackendConnected(true);
          console.log('[App] Categories loaded:', result.value.length);
        } else {
          // Use fallback categories
          const fallbackCats = getFallbackCategories();
          setCategories(fallbackCats);
          console.log('[App] Using fallback categories:', fallbackCats.length);
        }
      }
    };

    const initializeProducts = async () => {
      if (products.length === 0) {
        const result = await storageAdapter.getProducts();

        if (result.ok && result.value.length > 0) {
          const productsWithIcons = result.value.map((product) => ({
            ...product,
            icon: React.createElement(
              iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon
            ),
          }));
          setProducts(productsWithIcons);
          setBackendConnected(true);
          console.log('[App] Products loaded:', result.value.length);
        } else {
          // Use fallback products
          setProducts(getFallbackProducts());
          console.log('[App] Using fallback products');
        }
      }
    };

    const initializeOrderHistory = async () => {
      const result = await storageAdapter.getOrders();

      if (result.ok) {
        const paidOrders = result.value.filter((order) => order.status === 'paid');
        setOrderHistory(paidOrders);
        console.log('[App] Order history loaded:', paidOrders.length);
      }
    };

    initializeCategories();
    initializeProducts();
    initializeOrderHistory();

    if (users.length === 0) {
      setUsers([
        {
          id: 1,
          name: 'Germán',
          profilePicture: '/panxo.svg',
          pin: '1111',
          pinnedProductIds: [1, 2, 3, 4, 5, 6],
        },
        {
          id: 2,
          name: 'Marta',
          profilePicture: '/nuka.svg',
          pin: '1234',
          pinnedProductIds: [1, 2, 3],
        },
      ]);
    }

    if (tables.length === 0) {
      setTables([
        { id: 0, name: 'Barra', available: true },
        { id: 1, name: 'Mesa 1', available: true },
        { id: 2, name: 'Mesa 2', available: true },
        { id: 3, name: 'Mesa 3', available: true },
        { id: 4, name: 'Mesa 4', available: true },
        { id: 5, name: 'Mesa 5', available: true },
        { id: 6, name: 'Mesa 6', available: true },
        { id: 7, name: 'Mesa 7', available: true },
        { id: 8, name: 'Mesa 8', available: true },
        { id: 9, name: 'Mesa 9', available: true },
      ]);
    }

    if (!thermalPrinterOptions) {
      setThermalPrinterOptions({
        type: PrinterTypes.EPSON,
        interface: '//COM3',
        characterSet: CharacterSet.PC852_LATIN2,
        removeSpecialCharacters: false,
        lineCharacter: '-',
        breakLine: BreakLine.WORD,
        options: { timeout: 3000 },
      });
    }
  }, [
    categories.length,
    products.length,
    storageAdapter,
    setBackendConnected,
    setCategories,
    setOrderHistory,
    setProducts,
    setTables,
    setThermalPrinterOptions,
    setUsers,
    tables.length,
    thermalPrinterOptions,
    users.length,
  ]);

  const menuItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Inicio' },
    { id: 'products', icon: <ClipboardListIcon />, label: 'Productos' },
    { id: 'newOrder', icon: <PlusCircleIcon />, label: 'Nueva Comanda' },
    { id: 'orderHistory', icon: <HistoryIcon />, label: 'Historial' },
    { id: 'aeatInvoices', icon: <ReceiptIcon />, label: 'Facturas AEAT' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Ajustes' },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const previousSection = prevSectionRef.current;
    console.log('🔄 SECTION CHANGE:', {
      from: previousSection,
      to: activeSection,
      isMobile,
      timestamp: new Date().toLocaleTimeString(),
    });
    prevSectionRef.current = activeSection;
  }, [activeSection, isMobile]);
  // Optimized page variants - mantiene direcciones pero elimina scale y cálculos complejos
  const pageVariants = {
    enter: (direction: { axis: 'x' | 'y'; value: number }) => {
      // Simplified calculation - mantener direcciones forward/upward
      const enterValue =
        direction.value > 0
          ? direction.axis === 'x'
            ? '100%'
            : '30vh'
          : // Forward: right/down
          direction.axis === 'x'
            ? '-100%'
            : '-30vh'; // Backward: left/up

      return {
        [direction.axis]: enterValue,
        opacity: 0,
        // Eliminado: scale (costoso para GPU)
      };
    },
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      // Eliminado: scale
    },
    exit: (direction: { axis: 'x' | 'y'; value: number }) => {
      // Simplified calculation - mantener direcciones
      const exitValue =
        direction.value > 0
          ? direction.axis === 'x'
            ? '-100%'
            : '-30vh'
          : // Forward: left/up
          direction.axis === 'x'
            ? '100%'
            : '30vh'; // Backward: right/down

      return {
        [direction.axis]: exitValue,
        opacity: 0,
        // Eliminado: scale
      };
    },
  };

  // Optimized transition - más simple y rápido
  const pageTransition = {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: isMobile ? 0.25 : 0.3,
  };

  const getDirection = useCallback(
    (current: string) => {
      const previous = prevSectionRef.current;
      const menuOrder = ['home', 'products', 'newOrder', 'orderHistory', 'settings'];
      const currentIndex = menuOrder.indexOf(current);
      const previousIndex = menuOrder.indexOf(previous);

      // Fix: Handle equal case properly
      const direction =
        currentIndex === previousIndex
          ? 0 // No movement when same section
          : currentIndex > previousIndex
            ? 1
            : -1;

      const result = {
        axis: isMobile ? ('x' as const) : ('y' as const),
        value: direction,
      };

      // Debug logging
      if (direction !== 0) {
        console.log('🎯 TRANSITION DEBUG:', {
          current,
          previous,
          currentIndex,
          previousIndex,
          direction: direction > 0 ? 'FORWARD' : 'BACKWARD',
          isMobile,
          axis: result.axis,
          finalDirection: result.value,
        });
      }

      return result;
    },
    [isMobile]
  );

  if (shouldShow) {
    return <Onboarding />;
  }

  return (
    <div
      className={cn(
        'flex h-screen w-screen bg-background text-foreground overscroll-none',
        isMobile ? 'pb-20 pt-0 px-0' : 'pt-4 pr-4 pb-4',
        touchOptimizationsEnabled && 'touch-optimized'
      )}
    >
      <Toaster />
      <UpdateChecker autoCheck={true} checkInterval={3600000} />

      {/* Main Content */}
      {!selectedUser ? (
        <AnimatePresence>
          <motion.div
            key="login"
            custom={getDirection(activeSection)}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 bg-transparent"
          >
            <ErrorBoundary level="section" fallbackTitle="Error en Login">
              <Login users={users} onLogin={setSelectedUser} />
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      ) : (
        <>
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            isDarkMode={currentMode === 'dark'}
            toggleDarkMode={toggleDarkMode}
            menuItems={menuItems}
            loggedUser={selectedUser}
            onLogout={() => setSelectedUser(null)}
          />

          {/* Sidebar Toggle Button - Hide on mobile */}
          {!isMobile && (
            <SidebarToggleButton isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
          )}

          <main
            className={cn(
              'flex-1 h-full relative overscroll-y-none',
              isMobile && 'w-full'
            )}
          >
            <AnimatePresence custom={getDirection(activeSection)}>
              <motion.div
                key={activeSection}
                custom={getDirection(activeSection)}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                className="absolute inset-0 rounded-3xl overflow-hidden"
              >
                <Card
                  className={cn(
                    'h-full w-full bg-card border-card-border shadow-xl overflow-hidden',
                    isMobile ? 'rounded-none border-0' : 'rounded-3xl'
                  )}
                >
                  <CardContent className="p-0 h-full flex flex-col overflow-hidden bg-card text-card-foreground">
                    <div
                      className={cn(
                        'flex-shrink-0',
                        isMobile ? 'px-4 pt-4' : 'px-2 sm:px-6 pt-2 sm:pt-6'
                      )}
                    >
                      <SectionHeader menuItems={menuItems} activeSection={activeSection} />
                    </div>

                    {/*SECTIONS */}

                    <div className="flex-1 overflow-hidden">
                      {/* Home Section */}
                      {activeSection === 'home' && (
                        <div
                          className={cn(
                            'h-full overflow-y-auto',
                            isMobile ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                          )}
                        >
                          <ErrorBoundary level="section" fallbackTitle="Error en Inicio">
                            <Home userName={selectedUser?.name || 'Usuario desconocido'} />
                          </ErrorBoundary>
                        </div>
                      )}
                      {/* Products Section */}
                      {activeSection === 'products' && (
                        <div
                          className={cn(
                            'h-full overflow-y-auto',
                            isMobile ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                          )}
                        >
                          <ErrorBoundary level="section" fallbackTitle="Error en Productos">
                            <Products />
                          </ErrorBoundary>
                        </div>
                      )}
                      {/* NewOrder Section - No padding for mobile layout */}
                      {activeSection === 'newOrder' && (
                        <div className="h-full overflow-hidden">
                          <ErrorBoundary level="section" fallbackTitle="Error en Nueva Comanda">
                            <NewOrder />
                          </ErrorBoundary>
                        </div>
                      )}
                      {activeSection === 'orderHistory' && (
                        <div
                          className={cn(
                            'h-full overflow-y-auto',
                            isMobile ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                          )}
                        >
                          <ErrorBoundary level="section" fallbackTitle="Error en Historial">
                            <OrderHistory
                              setSelectedOrderId={setSelectedOrderId}
                              setActiveSection={setActiveSection}
                              selectedOrder={selectedOrder}
                              setSelectedOrder={setSelectedOrder}
                            />
                          </ErrorBoundary>
                        </div>
                      )}
                      {activeSection === 'aeatInvoices' && (
                        <div
                          className={cn(
                            'h-full overflow-y-auto',
                            isMobile ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                          )}
                        >
                          <ErrorBoundary level="section" fallbackTitle="Error en Facturas AEAT">
                            <AEATInvoices />
                          </ErrorBoundary>
                        </div>
                      )}
                      {activeSection === 'settings' && selectedUser && (
                        <div
                          className={cn(
                            'h-full overflow-y-auto',
                            isMobile ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                          )}
                        >
                          <ErrorBoundary level="section" fallbackTitle="Error en Ajustes">
                            <SettingsPanel
                              users={users}
                              selectedUser={selectedUser}
                              handleThermalPrinterOptionsChange={handleThermalPrinterOptionsChange}
                              thermalPrinterOptions={
                                thermalPrinterOptions as ThermalPrinterServiceOptions
                              }
                              isDarkMode={currentMode === 'dark'}
                              toggleDarkMode={toggleDarkMode}
                              isSidebarOpen={isSidebarOpen}
                              setSelectedUser={setSelectedUser}
                              setUsers={setUsers}
                            />
                          </ErrorBoundary>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Bottom Navigation for Mobile */}
          {isMobile && (
            <BottomNavigation
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              menuItems={menuItems}
              loggedUser={selectedUser}
              onLogout={() => setSelectedUser(null)}
            />
          )}
        </>
      )}

      {/* Debug Indicator */}
      {debugMode && <DebugIndicator />}
    </div>
  );
}

export default App;
