import './App.css';
import { Motion, Presence } from '@motionone/solid';
import { invoke } from '@tauri-apps/api/core';
import {
  BeerIcon,
  ClipboardListIcon,
  HistoryIcon,
  HomeIcon,
  PlusCircleIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-solid';
import { createEffect, createSignal, ErrorBoundary, Match, onMount, Show, Switch } from 'solid-js';
import fallbackProducts from '@/assets/products.json';
import iconOptions from '@/assets/utils/icons/iconOptions';
import BottomNavigation from '@/components/BottomNavigation';
import DebugIndicator from '@/components/DebugIndicator';
import LicenseSplashScreen from '@/components/LicenseSplashScreen';
import ScreenshotOverlay from '@/components/ScreenshotOverlay';
import AEATInvoices from '@/components/Sections/AEATInvoices';
import Customers from '@/components/Sections/Customers';
import Home from '@/components/Sections/Home';
import Login from '@/components/Sections/Login';
import NewOrder from '@/components/Sections/NewOrder';
import OrderHistory from '@/components/Sections/OrderHistory';
import Products from '@/components/Sections/Products';
import SectionHeader from '@/components/Sections/SectionHeader';
import SettingsPanel from '@/components/Sections/SettingsPanel';
import Sidebar from '@/components/SideBar';
import SidebarToggleButton from '@/components/SideBarToggleButton';
import UpdateChecker from '@/components/UpdateChecker';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { config } from '@/lib/config';
import { cn } from '@/lib/utils';
import type Product from '@/models/Product';
import {
  BreakLine,
  CharacterSet,
  PrinterTypes,
  type ThermalPrinterServiceOptions,
} from '@/models/ThermalPrinter';
import useStore from '@/store/store';
import type { LicenseStatus } from '@/types/license';

function App() {
  const store = useStore();

  // License state
  const [showLicenseSplash, setShowLicenseSplash] = createSignal(true);

  // Theme state - get initial from localStorage or default
  const getInitialMode = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  };

  const [currentMode, setCurrentMode] = createSignal<'light' | 'dark'>(getInitialMode());

  // Responsive state
  const [isMobile, setIsMobile] = createSignal(window.innerWidth < 768);
  const [_isTablet, setIsTablet] = createSignal(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  // Section state
  const [activeSection, setActiveSection] = createSignal('home');
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(true);
  let prevSection = 'home';

  // Handle window resize for responsive
  onMount(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  // Update document title based on active section
  createEffect(() => {
    const section = activeSection();
    const titles: Record<string, string> = {
      home: 'Inicio - TPV El Haido',
      products: 'Productos - TPV El Haido',
      newOrder: 'Nueva Comanda - TPV El Haido',
      orderHistory: 'Historial - TPV El Haido',
      customers: 'Clientes - TPV El Haido',
      aeatInvoices: 'Facturas AEAT - TPV El Haido',
      settings: 'Ajustes - TPV El Haido',
    };
    document.title = titles[section] || 'TPV El Haido';
  });

  const toggleDarkMode = () => {
    const newMode = currentMode() === 'dark' ? 'light' : 'dark';
    setCurrentMode(newMode);
    localStorage.setItem('theme-mode', newMode);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
  };

  // Apply initial theme
  onMount(() => {
    document.documentElement.classList.toggle('dark', currentMode() === 'dark');
  });

  const handleThermalPrinterOptionsChange = (options: ThermalPrinterServiceOptions | null) => {
    store.setThermalPrinterOptions(options);
  };

  // Helper function to get fallback products
  const getFallbackProducts = (): Product[] => {
    console.log('[App] Loading fallback products from products.json');
    const productsWithIcons = fallbackProducts.map((product) => ({
      ...product,
      icon: iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon,
    })) as Product[];
    console.log(`[App] Loaded ${productsWithIcons.length} fallback products`);
    return productsWithIcons;
  };

  // Helper function to get fallback categories
  const getFallbackCategories = () => {
    console.log('[App] Extracting fallback categories from products.json');
    const uniqueCategories = [
      ...new Set(fallbackProducts.map((product) => product.category)),
    ].filter(Boolean);
    return uniqueCategories.map((categoryName, index) => ({
      id: index + 1,
      name: categoryName,
      description: `Categoria ${categoryName}`,
      icon: undefined,
    }));
  };

  // License check function
  const checkLicense = async () => {
    // DEBUG MODE: Skip license validation entirely
    if (config.debug.enabled) {
      console.log('[License] DEBUG MODE - Skipping license validation');
      const debugStatus: LicenseStatus = {
        is_activated: true,
        is_valid: true,
        email: 'debug@test.local',
        license_type: 'enterprise',
        days_remaining: 9999,
        expires_at: null,
      };
      store.setLicenseStatus(debugStatus);
      setShowLicenseSplash(false);
      return;
    }

    try {
      const status = await invoke<LicenseStatus>('check_license_status');
      console.log('[License] Status:', status);

      store.setLicenseStatus(status);

      if (!status.is_activated || !status.is_valid) {
        setShowLicenseSplash(true);
        return;
      }

      setShowLicenseSplash(false);
    } catch (error) {
      console.error('[License] Error checking license:', error);
      setShowLicenseSplash(true);
    }
  };

  // Handle license activation complete
  const handleLicenseComplete = (status: LicenseStatus) => {
    store.setLicenseStatus(status);
    setShowLicenseSplash(false);

    if (!status.is_valid) {
      console.error('[License] Invalid license activated:', status);
    }
  };

  // Refresh license status
  const _refreshLicenseStatus = async () => {
    await checkLicense();
  };

  // Initialize data
  onMount(async () => {
    // Check license first before initializing anything else
    await checkLicense();

    // If license is not valid, don't initialize other data
    if (showLicenseSplash()) {
      return;
    }

    // Initialize categories
    if (store.state.categories.length === 0) {
      const result = await store.storageAdapter().getCategories();
      if (result.ok && result.value.length > 0) {
        store.setCategories(result.value);
        store.setBackendConnected(true);
        console.log('[App] Categories loaded:', result.value.length);
      } else {
        const fallbackCats = getFallbackCategories();
        store.setCategories(fallbackCats);
        console.log('[App] Using fallback categories:', fallbackCats.length);
      }
    }

    // Initialize products
    if (store.state.products.length === 0) {
      const result = await store.storageAdapter().getProducts();
      if (result.ok && result.value.length > 0) {
        const productsWithIcons = result.value.map((product) => ({
          ...product,
          icon:
            iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon,
        })) as Product[];
        store.setProducts(productsWithIcons);
        store.setBackendConnected(true);
        console.log('[App] Products loaded:', result.value.length);
      } else {
        store.setProducts(getFallbackProducts());
        console.log('[App] Using fallback products');
      }
    }

    // Initialize order history
    const ordersResult = await store.storageAdapter().getOrders();
    if (ordersResult.ok) {
      const paidOrders = ordersResult.value.filter((order) => order.status === 'paid');
      store.setOrderHistory(paidOrders);
      console.log('[App] Order history loaded:', paidOrders.length);
    }

    // Initialize users if empty
    if (store.state.users.length === 0) {
      store.setUsers([
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

    // Initialize tables if empty
    if (store.state.tables.length === 0) {
      store.setTables([
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

    // Initialize thermal printer options
    if (!store.state.thermalPrinterOptions) {
      store.setThermalPrinterOptions({
        type: PrinterTypes.EPSON,
        interface: '//COM3',
        characterSet: CharacterSet.PC852_LATIN2,
        removeSpecialCharacters: false,
        lineCharacter: '-',
        breakLine: BreakLine.WORD,
        options: { timeout: 3000 },
      });
    }
  });

  const menuItems = [
    { id: 'home', icon: HomeIcon, label: 'Inicio' },
    { id: 'products', icon: ClipboardListIcon, label: 'Productos' },
    { id: 'newOrder', icon: PlusCircleIcon, label: 'Nueva Comanda' },
    { id: 'orderHistory', icon: HistoryIcon, label: 'Historial' },
    { id: 'customers', icon: UsersIcon, label: 'Clientes' },
    { id: 'aeatInvoices', icon: ReceiptIcon, label: 'Facturas AEAT' },
    { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen());

  // Track section changes
  createEffect(() => {
    const current = activeSection();
    console.log('🔄 SECTION CHANGE:', {
      from: prevSection,
      to: current,
      isMobile: isMobile(),
      timestamp: new Date().toLocaleTimeString(),
    });
    prevSection = current;
  });


  return (
    <div
      class={cn(
        'flex h-screen w-screen bg-background text-foreground overscroll-none',
        isMobile() ? 'pb-20 pt-0 px-0' : 'pt-4 pr-4 pb-4',
        store.state.touchOptimizationsEnabled && 'touch-optimized'
      )}
    >
      <Toaster />
      <UpdateChecker autoCheck={true} checkInterval={3600000} />

      {/* License Splash Screen */}
      <Show when={showLicenseSplash()}>
        <LicenseSplashScreen onComplete={handleLicenseComplete} />
      </Show>

      {/* Main Content */}
      <Show
        when={!showLicenseSplash() && store.state.selectedUser}
        fallback={
          <Show when={!showLicenseSplash()}>
            <Presence>
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                class="absolute inset-0 bg-transparent"
              >
                <ErrorBoundary
                  fallback={(err) => (
                    <div class="p-4 text-destructive">
                      <h2>Error en Login</h2>
                      <p>{err.message}</p>
                    </div>
                  )}
                >
                  <Login users={store.state.users} onLogin={store.setSelectedUser} />
                </ErrorBoundary>
              </Motion.div>
            </Presence>
          </Show>
        }
      >
        <Sidebar
          isSidebarOpen={isSidebarOpen()}
          activeSection={activeSection()}
          setActiveSection={setActiveSection}
          isDarkMode={currentMode() === 'dark'}
          toggleDarkMode={toggleDarkMode}
          menuItems={menuItems}
          loggedUser={store.state.selectedUser!}
          onLogout={() => store.setSelectedUser(null)}
        />

        {/* Sidebar Toggle Button - Hide on mobile */}
        <Show when={!isMobile()}>
          <SidebarToggleButton isSidebarOpen={isSidebarOpen()} toggleSidebar={toggleSidebar} />
        </Show>

        <main class={cn('flex-1 h-full relative overscroll-y-none', isMobile() && 'w-full')}>
          <Card
            class={cn(
              'h-full w-full bg-card border-card-border shadow-xl overflow-hidden',
              isMobile() ? 'rounded-none border-0' : 'rounded-3xl'
            )}
          >
            <CardContent class="p-0 h-full flex flex-col overflow-hidden bg-card text-card-foreground">
              <div
                class={cn(
                  'flex-shrink-0',
                  isMobile() ? 'px-4 pt-4' : 'px-2 sm:px-6 pt-2 sm:pt-6'
                )}
              >
                <SectionHeader menuItems={menuItems} activeSection={activeSection()} />
              </div>

              <div class="flex-1 overflow-hidden">
                <Switch>
                  <Match when={activeSection() === 'home'}>
                    <div
                      class={cn(
                        'h-full overflow-y-auto',
                        isMobile() ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                      )}
                    >
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">Error en Inicio: {err.message}</div>
                        )}
                      >
                        <Home
                          userName={store.state.selectedUser?.name || 'Usuario desconocido'}
                        />
                      </ErrorBoundary>
                    </div>
                  </Match>

                  <Match when={activeSection() === 'products'}>
                    <div
                      class={cn(
                        'h-full overflow-y-auto',
                        isMobile() ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                      )}
                    >
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">Error en Productos: {err.message}</div>
                        )}
                      >
                        <Products />
                      </ErrorBoundary>
                    </div>
                  </Match>

                  <Match when={activeSection() === 'newOrder'}>
                    <div class="h-full overflow-hidden">
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">
                            Error en Nueva Comanda: {err.message}
                          </div>
                        )}
                      >
                        <NewOrder />
                      </ErrorBoundary>
                    </div>
                  </Match>

                  <Match when={activeSection() === 'orderHistory'}>
                    <div
                      class={cn(
                        'h-full overflow-y-auto',
                        isMobile() ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                      )}
                    >
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">Error en Historial: {err.message}</div>
                        )}
                      >
                        <OrderHistory
                          setSelectedOrderId={store.setSelectedOrderId}
                          setActiveSection={setActiveSection}
                          selectedOrder={store.state.selectedOrder}
                          setSelectedOrder={store.setSelectedOrder}
                        />
                      </ErrorBoundary>
                    </div>
                  </Match>

                  <Match when={activeSection() === 'customers'}>
                    <div
                      class={cn(
                        'h-full overflow-y-auto',
                        isMobile() ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                      )}
                    >
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">Error en Clientes: {err.message}</div>
                        )}
                      >
                        <Customers />
                      </ErrorBoundary>
                    </div>
                  </Match>

                  <Match when={activeSection() === 'aeatInvoices'}>
                    <div
                      class={cn(
                        'h-full overflow-y-auto',
                        isMobile() ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                      )}
                    >
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">
                            Error en Facturas AEAT: {err.message}
                          </div>
                        )}
                      >
                        <AEATInvoices />
                      </ErrorBoundary>
                    </div>
                  </Match>

                  <Match when={activeSection() === 'settings' && store.state.selectedUser}>
                    <div
                      class={cn(
                        'h-full overflow-y-auto',
                        isMobile() ? 'px-4 pb-4' : 'px-2 sm:px-6 pb-2 sm:pb-6'
                      )}
                    >
                      <ErrorBoundary
                        fallback={(err) => (
                          <div class="text-destructive">Error en Ajustes: {err.message}</div>
                        )}
                      >
                        <SettingsPanel
                          users={store.state.users}
                          selectedUser={store.state.selectedUser!}
                          handleThermalPrinterOptionsChange={handleThermalPrinterOptionsChange}
                          thermalPrinterOptions={
                            store.state.thermalPrinterOptions as ThermalPrinterServiceOptions
                          }
                          isDarkMode={currentMode() === 'dark'}
                          toggleDarkMode={toggleDarkMode}
                          isSidebarOpen={isSidebarOpen()}
                          setSelectedUser={store.setSelectedUser}
                          setUsers={store.setUsers}
                        />
                      </ErrorBoundary>
                    </div>
                  </Match>
                </Switch>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Bottom Navigation for Mobile */}
        <Show when={isMobile()}>
          <BottomNavigation
            activeSection={activeSection()}
            setActiveSection={setActiveSection}
            menuItems={menuItems}
            loggedUser={store.state.selectedUser!}
            onLogout={() => store.setSelectedUser(null)}
          />
        </Show>
      </Show>

      {/* Debug Indicator */}
      <Show when={store.state.debugMode}>
        <DebugIndicator />
      </Show>

      {/* Screenshot Overlay - Solo en modo debug */}
      <Show when={store.state.debugMode}>
        <ScreenshotOverlay activeSection={store.state.selectedUser ? activeSection() : 'login'} />
      </Show>
    </div>
  );
}

export default App;
