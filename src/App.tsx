import './App.css';
import { isErr } from '@mks2508/no-throw';
import { Motion, Presence } from '@motionone/solid';
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
import { createEffect, createSignal, Match, onMount, Show, Switch } from 'solid-js';
import fallbackProducts from '@/assets/products.json';
import iconOptions from '@/assets/utils/icons/iconOptions';
import AppSplashScreen from '@/components/AppSplashScreen';
import BottomNavigation from '@/components/BottomNavigation';
import DebugIndicator from '@/components/DebugIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LicenseSplashScreen from '@/components/LicenseSplashScreen';
import Onboarding from '@/components/Onboarding';
import { OnboardingProvider } from '@/components/Onboarding/OnboardingProvider';
import PWAStatus from '@/components/PWAStatus';
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
import UpdateChecker from '@/components/UpdateChecker';
import { Toaster } from '@/components/ui/toaster';
import { useAboutDialog } from '@/hooks/useAboutDialog';
import { useOnboarding } from '@/hooks/useOnboarding';
import { config } from '@/lib/config';
import { createContextLogger } from '@/lib/logger';
import { ASSET_PATHS } from '@/lib/paths';
import { setupNativeMenu } from '@/lib/setupNativeMenu';
import { useAppTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import type Product from '@/models/Product';
import type { TickmasterPrinterConfig } from '@/models/ThermalPrinter';
import { getPlatformService } from '@/services/platform';
import { loadPrinterConfig } from '@/services/thermal-printer.service';
import useStore from '@/store/store';
import type { LicenseStatus } from '@/types/license';

const log = createContextLogger('App');

function App() {
  const store = useStore();
  const _appTheme = useAppTheme();
  const onboarding = useOnboarding();

  // App splash state
  const [showAppSplash, setShowAppSplash] = createSignal(true);

  // License state
  const [showLicenseSplash, setShowLicenseSplash] = createSignal(true);

  // About dialog state
  const [forceAboutTab, setForceAboutTab] = createSignal(false);

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

  const handleThermalPrinterOptionsChange = (options: TickmasterPrinterConfig | null) => {
    store.setThermalPrinterOptions(options);
  };

  // Helper function to get fallback products
  const getFallbackProducts = (): Product[] => {
    log.debug('Loading fallback products from products.json');
    const productsWithIcons = fallbackProducts.map((product) => ({
      ...product,
      icon: iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon,
    })) as Product[];
    log.debug('Loaded fallback products', { count: productsWithIcons.length });
    return productsWithIcons;
  };

  // Helper function to get fallback categories
  const getFallbackCategories = () => {
    log.debug('Extracting fallback categories from products.json');
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

  // Seed products to database if empty
  const seedProductsIfNeeded = async () => {
    const result = await store.storageAdapter().getProducts();
    if (result.ok && result.value.length === 0) {
      log.info('Seeding products from fallback');
      const fallbackProds = getFallbackProducts();
      for (const product of fallbackProds) {
        await store.storageAdapter().createProduct(product);
      }
      // Recargar productos después de seed
      const reloaded = await store.storageAdapter().getProducts();
      if (reloaded.ok) {
        store.setProducts(reloaded.value);
        store.setBackendConnected(true);
        log.success('Seeded products to database', { count: reloaded.value.length });
      }
    }
  };

  // Seed categories to database if empty
  const seedCategoriesIfNeeded = async () => {
    const result = await store.storageAdapter().getCategories();
    if (result.ok && result.value.length === 0) {
      log.info('Seeding categories from fallback');
      const fallbackCats = getFallbackCategories();
      for (const category of fallbackCats) {
        await store.storageAdapter().createCategory(category);
      }
      // Recargar categorías después de seed
      const reloaded = await store.storageAdapter().getCategories();
      if (reloaded.ok) {
        store.setCategories(reloaded.value);
        log.success('Seeded categories to database', { count: reloaded.value.length });
      }
    }
  };

  // Initialize data
  const initializeData = async () => {
    // Setup native menu (Tauri only)
    const platform = getPlatformService();
    if (platform.isTauri()) {
      setupNativeMenu();
    }

    // If app splash or license splash is active, don't initialize data yet
    if (showAppSplash() || showLicenseSplash()) {
      return;
    }

    // Initialize categories
    if (store.state.categories.length === 0) {
      const result = await store.storageAdapter().getCategories();
      if (result.ok && result.value.length > 0) {
        store.setCategories(result.value);
        store.setBackendConnected(true);
        log.info('Categories loaded', { count: result.value.length });
      } else {
        await seedCategoriesIfNeeded();
        if (store.state.categories.length === 0) {
          const fallbackCats = getFallbackCategories();
          store.setCategories(fallbackCats);
          log.warn('Using fallback categories', { count: fallbackCats.length });
        }
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
        log.info('Products loaded', { count: result.value.length });
      } else {
        await seedProductsIfNeeded();
        if (store.state.products.length === 0) {
          const productsWithIcons = getFallbackProducts().map((product) => ({
            ...product,
            icon:
              iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon,
          })) as Product[];
          store.setProducts(productsWithIcons);
          log.warn('Using fallback products');
        }
      }
    }

    // Initialize order history
    const ordersResult = await store.storageAdapter().getOrders();
    if (ordersResult.ok) {
      const paidOrders = ordersResult.value.filter((order) => order.status === 'paid');
      store.setOrderHistory(paidOrders);
      log.info('Order history loaded', { count: paidOrders.length });
    }

    // Initialize users from database
    if (store.state.users.length === 0) {
      const usersResult = await store.storageAdapter().getUsers();
      if (usersResult.ok && usersResult.value.length > 0) {
        store.setUsers(usersResult.value);
        log.info('Users loaded from database', { count: usersResult.value.length });
      } else {
        // Create default users if database is empty
        const defaultUsers = [
          {
            id: 1,
            name: 'Germán',
            profilePicture: ASSET_PATHS.panxo,
            pin: '1111',
            pinnedProductIds: [1, 2, 3, 4, 5, 6],
          },
          {
            id: 2,
            name: 'Marta',
            profilePicture: ASSET_PATHS.nuka,
            pin: '1234',
            pinnedProductIds: [1, 2, 3],
          },
        ];
        for (const user of defaultUsers) {
          await store.storageAdapter().createUser(user);
        }
        store.setUsers(defaultUsers);
        log.info('Default users created and loaded', { count: defaultUsers.length });
      }
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

    // Initialize thermal printer options: load persisted config from disk, if any.
    if (!store.state.thermalPrinterOptions) {
      const configResult = await loadPrinterConfig();
      if (!isErr(configResult) && configResult.value) {
        store.setThermalPrinterOptions(configResult.value);
      }
      // si es null (primera vez, sin configurar aún): queda `null`, la UI de Settings debe
      // mostrar los campos vacíos, no un objeto inventado.
    }
  };

  // License check function
  const checkLicense = async () => {
    const platform = getPlatformService();

    // PWA MODE: Skip license validation entirely (no native fingerprinting)
    if (!platform.canUseLicenseSystem()) {
      log.info('PWA MODE - License system not available, skipping validation');
      const pwaStatus: LicenseStatus = {
        isActivated: true,
        isValid: true,
        email: 'pwa@web.local',
        licenseType: 'pwa',
        daysRemaining: null,
        expiresAt: null,
      };
      store.setLicenseStatus(pwaStatus);
      setShowAppSplash(false);
      setShowLicenseSplash(false);
      return;
    }

    // DEBUG MODE: Skip license validation entirely
    if (config.debug.enabled) {
      log.info('DEBUG MODE - Skipping license validation');
      const debugStatus: LicenseStatus = {
        isActivated: true,
        isValid: true,
        email: 'debug@test.local',
        licenseType: 'enterprise',
        daysRemaining: 9999,
        expiresAt: null,
      };
      store.setLicenseStatus(debugStatus);
      setShowAppSplash(false);
      setShowLicenseSplash(false);
      return;
    }

    try {
      const status = await platform.checkLicense();
      log.debug('License status', {
        isActivated: status.isActivated,
        isValid: status.isValid,
        type: status.licenseType,
        daysRemaining: status.daysRemaining,
      });

      store.setLicenseStatus(status);

      if (!status.isActivated || !status.isValid) {
        setShowLicenseSplash(true);
        return;
      }

      setShowLicenseSplash(false);
    } catch (error) {
      log.error('Error checking license', error instanceof Error ? error : undefined);
      setShowLicenseSplash(true);
    }
  };

  // Handle app splash complete
  const handleAppSplashComplete = async () => {
    setShowAppSplash(false);
    // Check license after splash completes
    await checkLicense();
  };

  // Handle license activation complete
  const handleLicenseComplete = (status: LicenseStatus) => {
    store.setLicenseStatus(status);
    setShowLicenseSplash(false);

    if (!status.isValid) {
      log.warn('Invalid license activated', { email: status.email, type: status.licenseType });
    }
  };

  // Refresh license status
  const _refreshLicenseStatus = async () => {
    await checkLicense();
  };

  // Watch for splash completion to initialize data
  createEffect(() => {
    const appSplashDone = !showAppSplash();
    const licenseSplashDone = !showLicenseSplash();
    if (appSplashDone && licenseSplashDone) {
      // Initialize data when both splashes are done
      initializeData();
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
    log.debug('Section change', { from: prevSection, to: current, isMobile: isMobile() });
    prevSection = current;
  });

  // Handle about dialog from native menu
  useAboutDialog(() => {
    setActiveSection('settings');
    setForceAboutTab(true);
    // Reset the force after a short delay
    setTimeout(() => setForceAboutTab(false), 100);
  });

  return (
    <div
      class={cn(
        'flex h-screen w-screen bg-background text-foreground overscroll-none',
        isMobile() ? 'pb-20 pt-0 px-0' : 'p-4',
        store.state.touchOptimizationsEnabled && 'touch-optimized'
      )}
    >
      <Toaster />
      <PWAStatus />
      <UpdateChecker autoCheck={true} checkInterval={3600000} />

      {/* App Splash Screen - Brand intro */}
      <Show when={showAppSplash()}>
        <AppSplashScreen onComplete={handleAppSplashComplete} />
      </Show>

      {/* License Splash Screen - Only show if app splash is done */}
      <Show when={!showAppSplash() && showLicenseSplash()}>
        <LicenseSplashScreen onComplete={handleLicenseComplete} />
      </Show>

      {/* Onboarding wizard — shown before login, after both splashes */}
      <Show when={onboarding.shouldShow() && !showAppSplash() && !showLicenseSplash()}>
        <Presence>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            class="absolute inset-0 z-50 bg-background"
          >
            <OnboardingProvider>
              <Onboarding />
            </OnboardingProvider>
          </Motion.div>
        </Presence>
      </Show>

      {/* Main Content - Only show if both splashes are done and wizard is not active */}
      <Show
        when={
          !showAppSplash() &&
          !showLicenseSplash() &&
          !onboarding.shouldShow() &&
          store.state.selectedUser
        }
        fallback={
          <Show when={!showAppSplash() && !showLicenseSplash() && !onboarding.shouldShow()}>
            <Presence>
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                class="absolute inset-0 bg-transparent"
              >
                <ErrorBoundary
                  level="page"
                  fallbackTitle="Error en Login"
                  fallbackMessage="No se ha podido cargar la pantalla de inicio de sesión."
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
          menuItems={menuItems}
          loggedUser={store.state.selectedUser!}
          onLogout={() => store.setSelectedUser(null)}
          toggleSidebar={toggleSidebar}
        />

        <main class={cn('flex-1 h-full relative overscroll-y-none', isMobile() && 'w-full')}>
          <div
            class={cn(
              'h-full w-full overflow-hidden flex flex-col text-card-foreground',
              isMobile() ? 'bg-card' : 'rounded-2xl border border-foreground/8'
            )}
            style={
              !isMobile()
                ? { background: 'color-mix(in oklch, var(--card) 90%, var(--foreground) 10%)' }
                : {}
            }
          >
            <div class={cn('flex-shrink-0', isMobile() ? 'px-3 pt-3' : 'px-4 pt-4')}>
              <SectionHeader menuItems={menuItems} activeSection={activeSection()} />
            </div>

            <div class="flex-1 overflow-hidden">
              <Switch>
                <Match when={activeSection() === 'home'}>
                  <div class={cn('h-full overflow-y-auto', isMobile() ? 'px-3 pb-3' : 'px-4 pb-4')}>
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Inicio"
                      fallbackMessage="No se ha podido cargar la pantalla de inicio."
                    >
                      <Home userName={store.state.selectedUser?.name || 'Usuario desconocido'} />
                    </ErrorBoundary>
                  </div>
                </Match>

                <Match when={activeSection() === 'products'}>
                  <div class={cn('h-full overflow-y-auto', isMobile() ? 'px-3 pb-3' : 'px-4 pb-4')}>
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Productos"
                      fallbackMessage="No se ha podido cargar la pantalla de productos."
                    >
                      <Products />
                    </ErrorBoundary>
                  </div>
                </Match>

                <Match when={activeSection() === 'newOrder'}>
                  <div class="h-full overflow-hidden">
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Nueva Comanda"
                      fallbackMessage="No se ha podido cargar la pantalla de nuevas comandas."
                    >
                      <NewOrder />
                    </ErrorBoundary>
                  </div>
                </Match>

                <Match when={activeSection() === 'orderHistory'}>
                  <div class={cn('h-full overflow-y-auto', isMobile() ? 'px-3 pb-3' : 'px-4 pb-4')}>
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Historial"
                      fallbackMessage="No se ha podido cargar el historial de pedidos."
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
                  <div class={cn('h-full overflow-y-auto', isMobile() ? 'px-3 pb-3' : 'px-4 pb-4')}>
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Clientes"
                      fallbackMessage="No se ha podido cargar la pantalla de clientes."
                    >
                      <Customers />
                    </ErrorBoundary>
                  </div>
                </Match>

                <Match when={activeSection() === 'aeatInvoices'}>
                  <div class={cn('h-full overflow-y-auto', isMobile() ? 'px-3 pb-3' : 'px-4 pb-4')}>
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Facturas AEAT"
                      fallbackMessage="No se ha podido cargar la pantalla de facturación."
                    >
                      <AEATInvoices />
                    </ErrorBoundary>
                  </div>
                </Match>

                <Match when={activeSection() === 'settings' && store.state.selectedUser}>
                  <div class="h-full overflow-hidden">
                    <ErrorBoundary
                      level="section"
                      fallbackTitle="Error en Ajustes"
                      fallbackMessage="No se ha podido cargar la pantalla de ajustes."
                    >
                      <OnboardingProvider>
                        <SettingsPanel
                          users={store.state.users}
                          selectedUser={store.state.selectedUser!}
                          handleThermalPrinterOptionsChange={handleThermalPrinterOptionsChange}
                          thermalPrinterOptions={store.state.thermalPrinterOptions}
                          isSidebarOpen={isSidebarOpen()}
                          setSelectedUser={store.setSelectedUser}
                          setUsers={store.setUsers}
                          forceAboutTab={forceAboutTab()}
                        />
                      </OnboardingProvider>
                    </ErrorBoundary>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>
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
