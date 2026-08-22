import { batch, createRoot, createSignal } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { config } from '@/lib/config';
import { storeLog } from '@/lib/logger';
import type Category from '@/models/Category';
import type Customer from '@/models/Customer';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import type { TickmasterPrinterConfig } from '@/models/ThermalPrinter';
import type User from '@/models/User';
import type { IAuditContext } from '@/services/audit.service';
import * as audit from '@/services/audit.service';
import { HttpStorageAdapter } from '@/services/http-storage-adapter';
import { IndexedDbStorageAdapter } from '@/services/indexeddb-storage-adapter';
import { getPlatformService, isTauri } from '@/services/platform';
import { SqliteStorageAdapter } from '@/services/sqlite-storage-adapter';
import type { IStorageAdapter, StorageMode } from '@/services/storage-adapter.interface';
import type { LicenseStatus } from '@/types/license';

/**
 * Obtiene el NIF del negocio desde la configuración AEAT en localStorage.
 * Exportado para que Login y componentes de licencia puedan construir contextos de auditoría
 * antes de que haya un usuario seleccionado en el store.
 * @returns NIF string o cadena vacía si no está configurado
 */
export const getBusinessNif = (): string => {
  try {
    const saved = localStorage.getItem('tpv-aeat-config');
    if (saved) {
      const aeatConfig = JSON.parse(saved);
      return aeatConfig?.businessData?.nif ?? '';
    }
  } catch {
    // Ignore parse errors
  }
  return '';
};

// Debounce utility for localStorage
const debounce = <T extends (...args: unknown[]) => void>(fn: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

// Debounced localStorage setters
// @ts-expect-error - Type assertion for debounce signature mismatch
const debouncedLocalStorageSet = debounce((key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    storeLog.warn(`Failed to save ${key} to localStorage:`, error);
  }
}, 300) as (key: string, value: string) => void;

// State types
export interface AppState {
  users: User[];
  selectedUser: User | null;
  selectedOrder: Order | null;
  selectedOrderId: number | null;
  thermalPrinterOptions: TickmasterPrinterConfig | null;
  tables: ITable[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orderHistory: Order[];
  paymentMethod: string;
  cashAmount: string;
  showTicketDialog: boolean;
  storageMode: StorageMode;
  useStockImages: boolean;
  touchOptimizationsEnabled: boolean;
  debugMode: boolean;
  isBackendConnected: boolean;
  autoOpenCashDrawer: boolean;
  taxRate: number;
  activeOrders: Order[];
  recentProducts: Product[];
  licenseStatus: LicenseStatus | null;
  showLicenseDialog: boolean;
}

// Initialize storage adapters
const sqliteAdapter = new SqliteStorageAdapter(getPlatformService());
const httpAdapter = new HttpStorageAdapter();
const indexedDbAdapter = new IndexedDbStorageAdapter();

// Get storage adapter based on mode
const getStorageAdapterForMode = (mode: StorageMode): IStorageAdapter => {
  switch (mode) {
    case 'sqlite':
      return sqliteAdapter;
    case 'http':
      return httpAdapter;
    default:
      return indexedDbAdapter;
  }
};

// Get initial storage mode from env, localStorage, or smart defaults
const getInitialStorageMode = (): StorageMode => {
  const inTauri = isTauri();

  try {
    const saved = localStorage.getItem('tpv-storage-mode') as StorageMode | null;
    // Only honor saved value if it's valid for the current environment:
    // - sqlite requires Tauri (no invoke() in web)
    // - http and indexeddb are always valid
    if (saved === 'sqlite' && inTauri) return 'sqlite';
    if (saved === 'http' || saved === 'indexeddb') return saved;
  } catch {
    // Ignore localStorage errors
  }

  if (config.storage.defaultMode === 'sqlite' && inTauri) return 'sqlite';
  if (config.storage.defaultMode === 'http') return 'http';
  if (config.storage.defaultMode === 'indexeddb') return 'indexeddb';

  return inTauri ? 'sqlite' : 'indexeddb';
};

// Get initial stock images setting from localStorage
const getInitialUseStockImages = (): boolean => {
  try {
    const saved = localStorage.getItem('tpv-use-stock-images');
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
};

// Get initial auto-open cash drawer setting
const getInitialAutoOpenCashDrawer = (): boolean => {
  try {
    const saved = localStorage.getItem('tpv-auto-open-cash-drawer');
    return saved === 'true';
  } catch {
    return false;
  }
};

// Get initial tax rate from localStorage
const getInitialTaxRate = (): number => {
  try {
    const saved = localStorage.getItem('tpv-tax-rate');
    return saved !== null ? parseFloat(saved) : 21;
  } catch {
    return 21;
  }
};

const initialStorageMode = getInitialStorageMode();

// Create the store using createRoot to ensure it's a singleton
function createAppStore() {
  // State store (for serializable data)
  const [state, setState] = createStore<AppState>({
    users: [],
    selectedUser: null,
    selectedOrder: null,
    selectedOrderId: null,
    thermalPrinterOptions: null,
    tables: [],
    categories: [],
    products: [],
    customers: [],
    storageMode: initialStorageMode,
    useStockImages: getInitialUseStockImages(),
    debugMode: config.debug.enabled,
    isBackendConnected: false,
    orderHistory: [],
    paymentMethod: 'efectivo',
    cashAmount: '',
    showTicketDialog: false,
    activeOrders: [],
    recentProducts: [],
    touchOptimizationsEnabled: false,
    autoOpenCashDrawer: getInitialAutoOpenCashDrawer(),
    taxRate: getInitialTaxRate(),
    licenseStatus: null,
    showLicenseDialog: false,
  });

  // Storage adapter signal (non-serializable)
  const [storageAdapter, setStorageAdapterInternal] = createSignal<IStorageAdapter>(
    getStorageAdapterForMode(initialStorageMode)
  );

  /**
   * Construye el contexto de auditoría a partir del estado actual del store.
   * Retorna null si no hay usuario seleccionado o NIF configurado.
   */
  const getAuditContext = (): IAuditContext | null => {
    const user = state.selectedUser;
    const nif = getBusinessNif();
    if (!user || !nif) return null;
    return { userId: user.id, userName: user.name, businessNif: nif };
  };

  // === SETTERS ===

  const setUsers = (users: User[]) => {
    // Ensure we create a new array reference to trigger reactivity
    setState('users', users.slice());
  };

  const setSelectedUser = (user: User | null) => {
    if (user !== null) {
      // Login: construimos el contexto con el usuario que acaba de autenticarse
      const nif = getBusinessNif();
      const ctx: IAuditContext = { userId: user.id, userName: user.name, businessNif: nif };
      void audit.logLogin(ctx, true);
    } else {
      // Logout: usamos el contexto del usuario actual antes de borrarlo
      const ctx = getAuditContext();
      if (ctx) void audit.logLogout(ctx);
    }
    setState('selectedUser', user);
  };

  const setSelectedOrder = (order: Order | null) => setState('selectedOrder', order);

  const setSelectedOrderId = (orderId: number | null) => {
    batch(() => {
      setState('selectedOrderId', orderId);
      const foundOrder = state.activeOrders.find((o) => o.id === orderId) || null;
      setState('selectedOrder', foundOrder);
    });
  };

  const setThermalPrinterOptions = (options: TickmasterPrinterConfig | null) =>
    setState('thermalPrinterOptions', options);

  const setTables = (tables: ITable[]) => {
    setState('tables', tables.slice());
  };

  const setCategories = (categories: Category[]) => {
    setState('categories', categories.slice());
  };

  const setProducts = (products: Product[]) => {
    const uniqueProducts = products.filter(
      (product, index, self) => index === self.findIndex((p) => p.id === product.id)
    );
    setState('products', uniqueProducts.slice());
  };

  const setCustomers = (customers: Customer[]) => {
    const uniqueCustomers = customers.filter(
      (customer, index, self) => index === self.findIndex((c) => c.id === customer.id)
    );
    setState('customers', uniqueCustomers.slice());
  };

  const addCustomer = async (customer: Customer) => {
    const dataService = storageAdapter();
    if (dataService.createCustomer) {
      const result = await dataService.createCustomer(customer);
      if (result.ok) {
        setState(
          produce((s) => {
            s.customers.push(customer);
          })
        );
        const ctx = getAuditContext();
        if (ctx) audit.logUserCreate(ctx, String(customer.id), customer);
      }
      return result;
    }
    // Fallback: just add to state if storage doesn't support customers
    setState(
      produce((s) => {
        s.customers.push(customer);
      })
    );
  };

  const updateCustomer = async (customer: Customer) => {
    const dataService = storageAdapter();
    if (dataService.updateCustomer) {
      const oldCustomer = state.customers.find((c) => c.id === customer.id);
      const result = await dataService.updateCustomer(customer);
      if (result.ok) {
        setState(
          produce((s) => {
            const index = s.customers.findIndex((c) => c.id === customer.id);
            if (index !== -1) {
              s.customers[index] = customer;
            }
          })
        );
        const ctx = getAuditContext();
        if (ctx) audit.logUserUpdate(ctx, String(customer.id), oldCustomer, customer);
      }
      return result;
    }
    // Fallback: just update state if storage doesn't support customers
    setState(
      produce((s) => {
        const index = s.customers.findIndex((c) => c.id === customer.id);
        if (index !== -1) {
          s.customers[index] = customer;
        }
      })
    );
  };

  const deleteCustomer = async (customerId: number) => {
    const dataService = storageAdapter();
    const customerToDelete = state.customers.find((c) => c.id === customerId);
    if (customerToDelete && dataService.deleteCustomer) {
      const result = await dataService.deleteCustomer(customerToDelete);
      if (result.ok) {
        setState(
          produce((s) => {
            s.customers = s.customers.filter((c) => c.id !== customerId);
          })
        );
        const ctx = getAuditContext();
        if (ctx) audit.logUserDelete(ctx, String(customerId), customerToDelete);
      }
      return result;
    }
    // Fallback: just remove from state if storage doesn't support customers
    setState(
      produce((s) => {
        s.customers = s.customers.filter((c) => c.id !== customerId);
      })
    );
  };

  const setOrderHistory = (orderHistory: Order[]) => {
    setState('orderHistory', orderHistory.slice());
  };

  const setActiveOrders = (activeOrders: Order[]) => {
    setState('activeOrders', activeOrders.slice());
  };

  const setRecentProducts = (recentProducts: Product[]) =>
    setState('recentProducts', recentProducts.slice());

  const setPaymentMethod = (method: string) => setState('paymentMethod', method);

  const setCashAmount = (amount: string) => setState('cashAmount', amount);

  const setShowTicketDialog = (show: boolean) => setState('showTicketDialog', show);

  const setUseStockImages = (use: boolean) => {
    setState('useStockImages', use);
    debouncedLocalStorageSet('tpv-use-stock-images', use.toString());
  };

  const setTouchOptimizationsEnabled = (enabled: boolean) => {
    setState('touchOptimizationsEnabled', enabled);
    debouncedLocalStorageSet('tpv-touch-optimizations', enabled.toString());
  };

  const setDebugMode = (enabled: boolean) => {
    setState('debugMode', enabled);
    debouncedLocalStorageSet('tpv-debug-mode', enabled.toString());
  };

  const setBackendConnected = (connected: boolean) => setState('isBackendConnected', connected);

  const setAutoOpenCashDrawer = (enabled: boolean) => {
    const ctx = getAuditContext();
    if (ctx)
      void audit.logSettingsChange(ctx, 'autoOpenCashDrawer', state.autoOpenCashDrawer, enabled);
    setState('autoOpenCashDrawer', enabled);
    debouncedLocalStorageSet('tpv-auto-open-cash-drawer', enabled.toString());
  };

  const setTaxRate = (rate: number) => {
    const ctx = getAuditContext();
    if (ctx) void audit.logSettingsChange(ctx, 'taxRate', state.taxRate, rate);
    setState('taxRate', rate);
    debouncedLocalStorageSet('tpv-tax-rate', rate.toString());
  };

  const setStorageMode = (mode: StorageMode) => {
    const ctx = getAuditContext();
    if (ctx) void audit.logSettingsChange(ctx, 'storageMode', state.storageMode, mode);
    batch(() => {
      setState('storageMode', mode);
      setStorageAdapterInternal(getStorageAdapterForMode(mode) as IStorageAdapter);
    });
    localStorage.setItem('tpv-storage-mode', mode);
  };

  const setLicenseStatus = (status: LicenseStatus | null) => setState('licenseStatus', status);

  const setShowLicenseDialog = (show: boolean) => setState('showLicenseDialog', show);

  // === PRODUCT CRUD ===

  const addProduct = async (product: Product) => {
    const result = await storageAdapter().createProduct(product);
    if (result.ok) {
      const ctx = getAuditContext();
      if (ctx) void audit.logProductCreate(ctx, String(product.id), product);
    }
    return result;
  };

  const updateProduct = async (product: Product) => {
    const oldProduct = state.products.find((p) => p.id === product.id);
    const result = await storageAdapter().updateProduct(product);
    if (result.ok) {
      const ctx = getAuditContext();
      if (ctx) void audit.logProductUpdate(ctx, String(product.id), oldProduct, product);
    }
    return result;
  };

  const deleteProduct = async (product: Product) => {
    const result = await storageAdapter().deleteProduct(product);
    if (result.ok) {
      const ctx = getAuditContext();
      if (ctx) void audit.logProductDelete(ctx, String(product.id), product);
    }
    return result;
  };

  // === CATEGORY CRUD ===

  const addCategory = async (category: Category) => {
    const result = await storageAdapter().createCategory(category);
    if (result.ok) {
      const ctx = getAuditContext();
      if (ctx) void audit.logCategoryCreate(ctx, String(category.id), category);
    }
    return result;
  };

  const updateCategory = async (category: Category) => {
    const oldCategory = state.categories.find((c) => c.id === category.id);
    const result = await storageAdapter().updateCategory(category);
    if (result.ok) {
      const ctx = getAuditContext();
      if (ctx) void audit.logCategoryUpdate(ctx, String(category.id), oldCategory, category);
    }
    return result;
  };

  const deleteCategory = async (category: Category) => {
    const result = await storageAdapter().deleteCategory(category);
    if (result.ok) {
      const ctx = getAuditContext();
      if (ctx) void audit.logCategoryDelete(ctx, String(category.id), category);
    }
    return result;
  };

  // === COMPLEX ACTIONS ===

  const handleTableChange = async (tableId: number) => {
    const dataService = storageAdapter();
    storeLog.debug('Changing to table', { tableId });

    // Only find existing orders with items (active orders)
    const existingOrder = state.activeOrders.find(
      (order) =>
        order.tableNumber === tableId && order.status === 'inProgress' && order.items.length > 0
    );

    if (existingOrder) {
      storeLog.debug('Found existing active order', { orderId: existingOrder.id, tableId });
      batch(() => {
        setState('selectedOrderId', existingOrder.id);
        setState('selectedOrder', existingOrder);
      });
    } else {
      // Look for empty orders to reuse
      const emptyOrdersWithoutTable = state.activeOrders.filter(
        (order) =>
          order.items.length === 0 && (order.tableNumber === 0 || order.tableNumber === null)
      );

      if (emptyOrdersWithoutTable.length > 0) {
        storeLog.debug('Assigning empty order to table', {
          orderId: emptyOrdersWithoutTable[0].id,
          tableId,
        });
        const updatedOrder: Order = { ...emptyOrdersWithoutTable[0], tableNumber: tableId };

        try {
          await dataService.updateOrder(updatedOrder);
          setState(
            produce((s) => {
              const orderIndex = s.activeOrders.findIndex(
                (order) => order.id === emptyOrdersWithoutTable[0].id
              );
              if (orderIndex !== -1) {
                s.activeOrders[orderIndex] = updatedOrder;
              }
              s.selectedOrderId = emptyOrdersWithoutTable[0].id;
              s.selectedOrder = updatedOrder;
            })
          );
          const ctx = getAuditContext();
          if (ctx) void audit.logTableAssign(ctx, tableId, emptyOrdersWithoutTable[0].id);
        } catch (error) {
          storeLog.error('Error updating empty order', error instanceof Error ? error : undefined);
        }
      } else {
        storeLog.debug('Creating new order for table', { tableId });
        const newId = Date.now() + Math.floor(Math.random() * 1000);
        const newOrder: Order = {
          id: newId,
          tableNumber: tableId,
          status: 'inProgress',
          ticketPath: '',
          paymentMethod: 'efectivo',
          items: [] as OrderItem[],
          total: 0,
          date: new Date().toISOString().split('T')[0],
          itemCount: 0,
          totalPaid: 0,
          change: 0,
        };

        try {
          await dataService.createOrder(newOrder);
          batch(() => {
            setState(
              produce((s) => {
                s.activeOrders.push(newOrder);
              })
            );
            setState('selectedOrderId', newOrder.id);
            setState('selectedOrder', newOrder);
          });
          const ctx = getAuditContext();
          if (ctx) {
            void audit.logOrderCreate(ctx, newOrder.id, newOrder, tableId);
            void audit.logTableAssign(ctx, tableId, newOrder.id);
          }
        } catch (error) {
          storeLog.error('Error creating new order', error instanceof Error ? error : undefined);
        }
      }
    }
  };

  const handleCompleteOrder = async (order: Order) => {
    const dataService = storageAdapter();
    const currentOrder = state.activeOrders.find((o) => o.id === order.id) || order;
    const completedOrder: Order = {
      ...currentOrder,
      status: 'paid',
      itemCount: currentOrder.items.reduce((sum, item) => sum + item.quantity, 0),
      ticketPath: `/home/mks/WebStormProjects/tpv/tickets/ticket-${currentOrder.id}_${new Date().toISOString().split('T')[0]}.pdf`,
    };
    await dataService.updateOrder(completedOrder);
    setState(
      produce((s) => {
        s.orderHistory.push(completedOrder);
        s.activeOrders = s.activeOrders.filter((o) => o.id !== completedOrder.id);
        s.paymentMethod = 'efectivo';
        s.cashAmount = '';
        s.showTicketDialog = false;
        s.selectedOrderId = null;
      })
    );
    const ctx = getAuditContext();
    if (ctx) {
      void audit.logOrderComplete(
        ctx,
        completedOrder.id,
        completedOrder,
        completedOrder.paymentMethod
      );
      if (completedOrder.paymentMethod) {
        void audit.logPayment(ctx, completedOrder.id, completedOrder.paymentMethod, {
          total: completedOrder.total,
          itemCount: completedOrder.itemCount,
          tableNumber: completedOrder.tableNumber,
        });
      }
    }
  };

  const closeOrder = async (orderId: number) => {
    const dataService = storageAdapter();
    const orderToDelete = state.activeOrders.find((o) => o.id === orderId);
    if (orderToDelete) {
      await dataService.deleteOrder(orderToDelete);
    }
    setState(
      produce((s) => {
        s.activeOrders = s.activeOrders.filter((o) => o.id !== orderId);
        s.orderHistory = s.orderHistory.filter((o) => o.id !== orderId);
        // Clear selection if the closed order was selected, don't auto-select another
        if (s.selectedOrderId === orderId) {
          s.selectedOrderId = null;
          s.selectedOrder = null;
        }
      })
    );
    const ctx = getAuditContext();
    if (ctx) audit.logOrderCancel(ctx, orderId, 'Order closed');
  };

  const addToOrder = async (orderId: number, item: Product | OrderItem) => {
    setState(
      produce((s) => {
        const orderIndex = s.activeOrders.findIndex((order) => order.id === orderId);
        if (orderIndex !== -1) {
          const order = s.activeOrders[orderIndex];
          const existingItemIndex = order.items.findIndex((orderItem) => orderItem.id === item.id);
          if (existingItemIndex !== -1) {
            order.items[existingItemIndex].quantity += 1;
          } else {
            order.items.push({
              name: item.name,
              price: item.price,
              id: item.id,
              quantity: 'quantity' in item ? item.quantity : 1,
              category: item.category,
            });
          }
          order.itemCount += 1;
          order.total += item.price;
        }
      })
    );
    const updatedOrder = state.activeOrders.find((order) => order.id === orderId);
    if (updatedOrder) {
      const dataService = storageAdapter();
      await dataService.updateOrder(updatedOrder);
      const ctx = getAuditContext();
      if (ctx) void audit.logOrderUpdate(ctx, orderId, undefined, updatedOrder);
    }
  };

  const removeFromOrder = async (orderId: number, productId: number) => {
    storeLog.debug('Removing product from order', { orderId, productId });

    setState(
      produce((s) => {
        const orderIndex = s.activeOrders.findIndex((order) => order.id === orderId);
        if (orderIndex !== -1) {
          const order = s.activeOrders[orderIndex];
          const existingItemIndex = order.items.findIndex((item) => item.id === productId);

          if (existingItemIndex !== -1) {
            const item = order.items[existingItemIndex];
            storeLog.debug('Current item before removal', {
              itemName: item.name,
              quantity: item.quantity,
              price: item.price,
            });

            if (item.quantity > 1) {
              item.quantity -= 1;
              order.itemCount = Math.max(0, order.itemCount - 1);
              order.total = Math.max(0, order.total - item.price);
            } else {
              order.items.splice(existingItemIndex, 1);
              order.itemCount = Math.max(0, order.itemCount - 1);
              order.total = Math.max(0, order.total - item.price);
            }

            // Recalculate totals from scratch
            order.total = order.items.reduce(
              (sum, orderItem) => sum + orderItem.price * orderItem.quantity,
              0
            );
            order.itemCount = order.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);

            storeLog.debug('Order totals after removal', {
              total: order.total,
              itemCount: order.itemCount,
            });
          }
        }
      })
    );

    const updatedOrder = state.activeOrders.find((order) => order.id === orderId);
    if (updatedOrder) {
      try {
        const dataService = storageAdapter();
        await dataService.updateOrder(updatedOrder);
        const ctx = getAuditContext();
        if (ctx) void audit.logOrderUpdate(ctx, orderId, undefined, updatedOrder);
      } catch (error) {
        storeLog.error('Error updating order', error instanceof Error ? error : undefined);
      }
    }
  };

  return {
    // State (reactive)
    state,
    // Storage adapter signal
    storageAdapter,
    // Setters
    setUsers,
    setSelectedUser,
    setSelectedOrder,
    setSelectedOrderId,
    setThermalPrinterOptions,
    setTables,
    setCategories,
    setProducts,
    setCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    setOrderHistory,
    setActiveOrders,
    setRecentProducts,
    setPaymentMethod,
    setCashAmount,
    setShowTicketDialog,
    setUseStockImages,
    setTouchOptimizationsEnabled,
    setDebugMode,
    setBackendConnected,
    setAutoOpenCashDrawer,
    setTaxRate,
    setStorageMode,
    setLicenseStatus,
    setShowLicenseDialog,
    // Audit
    getAuditContext,
    // Complex actions
    handleTableChange,
    handleCompleteOrder,
    closeOrder,
    addToOrder,
    removeFromOrder,
  };
}

// Create singleton store inside createRoot for proper ownership
let store: ReturnType<typeof createAppStore>;

export function useStore() {
  if (!store) {
    createRoot(() => {
      store = createAppStore();
    });
  }
  return store;
}

export default useStore;
