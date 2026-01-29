import { batch, createRoot, createSignal } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { config } from '@/lib/config';
import type Category from '@/models/Category';
import type Customer from '@/models/Customer';
import type Order from '@/models/Order';
import type { OrderItem } from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import type { ThermalPrinterServiceOptions } from '@/models/ThermalPrinter';
import type User from '@/models/User';
import { HttpStorageAdapter } from '@/services/http-storage-adapter';
import { IndexedDbStorageAdapter } from '@/services/indexeddb-storage-adapter';
import { SqliteStorageAdapter } from '@/services/sqlite-storage-adapter';
import type { IStorageAdapter, StorageMode } from '@/services/storage-adapter.interface';
import type { LicenseStatus } from '@/types/license';

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
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
}, 300) as (key: string, value: string) => void;

// State types
export interface AppState {
  users: User[];
  selectedUser: User | null;
  selectedOrder: Order | null;
  selectedOrderId: number | null;
  thermalPrinterOptions: ThermalPrinterServiceOptions | null;
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
const sqliteAdapter = new SqliteStorageAdapter();
const httpAdapter = new HttpStorageAdapter();
const indexedDbAdapter = new IndexedDbStorageAdapter();

// Check if running in Tauri environment
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

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
  try {
    const saved = localStorage.getItem('tpv-storage-mode') as StorageMode | null;
    if (saved === 'sqlite' || saved === 'http' || saved === 'indexeddb') {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }

  if (config.storage.defaultMode) {
    return config.storage.defaultMode;
  }

  if (isTauri()) {
    return 'sqlite';
  }

  return 'indexeddb';
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
    debugMode: true,
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

  // === SETTERS ===

  const setUsers = (users: User[]) => setState('users', users);

  const setSelectedUser = (user: User | null) => setState('selectedUser', user);

  const setSelectedOrder = (order: Order | null) => setState('selectedOrder', order);

  const setSelectedOrderId = (orderId: number | null) => {
    batch(() => {
      setState('selectedOrderId', orderId);
      setState('selectedOrder', state.activeOrders.find((o) => o.id === orderId) || null);
    });
  };

  const setThermalPrinterOptions = (options: ThermalPrinterServiceOptions | null) =>
    setState('thermalPrinterOptions', options);

  const setTables = (tables: ITable[]) => setState('tables', tables);

  const setCategories = (categories: Category[]) => setState('categories', categories);

  const setProducts = (products: Product[]) => {
    const uniqueProducts = products.filter(
      (product, index, self) => index === self.findIndex((p) => p.id === product.id)
    );
    setState('products', uniqueProducts);
  };

  const setCustomers = (customers: Customer[]) => {
    const uniqueCustomers = customers.filter(
      (customer, index, self) => index === self.findIndex((c) => c.id === customer.id)
    );
    setState('customers', uniqueCustomers);
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

  const setOrderHistory = (orderHistory: Order[]) => setState('orderHistory', orderHistory);

  const setActiveOrders = (activeOrders: Order[]) => setState('activeOrders', activeOrders);

  const setRecentProducts = (recentProducts: Product[]) =>
    setState('recentProducts', recentProducts);

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
    setState('autoOpenCashDrawer', enabled);
    debouncedLocalStorageSet('tpv-auto-open-cash-drawer', enabled.toString());
  };

  const setTaxRate = (rate: number) => {
    setState('taxRate', rate);
    debouncedLocalStorageSet('tpv-tax-rate', rate.toString());
  };

  const setStorageMode = (mode: StorageMode) => {
    batch(() => {
      setState('storageMode', mode);
      setStorageAdapterInternal(getStorageAdapterForMode(mode) as IStorageAdapter);
    });
    localStorage.setItem('tpv-storage-mode', mode);
  };

  const setLicenseStatus = (status: LicenseStatus | null) => setState('licenseStatus', status);

  const setShowLicenseDialog = (show: boolean) => setState('showLicenseDialog', show);

  // === COMPLEX ACTIONS ===

  const handleTableChange = async (tableId: number) => {
    const dataService = storageAdapter();
    console.log(`[handleTableChange] Changing to table ${tableId}`);

    const existingOrder = state.activeOrders.find(
      (order) => order.tableNumber === tableId && order.status === 'inProgress'
    );

    if (existingOrder) {
      console.log(
        `[handleTableChange] Found existing order ${existingOrder.id} for table ${tableId}`
      );
      batch(() => {
        setState('selectedOrderId', existingOrder.id);
        setState('selectedOrder', existingOrder);
      });
    } else {
      const emptyOrdersWithoutTable = state.activeOrders.filter(
        (order) =>
          order.items.length === 0 && (order.tableNumber === 0 || order.tableNumber === null)
      );

      if (emptyOrdersWithoutTable.length > 0) {
        console.log(
          `[handleTableChange] Assigning empty order ${emptyOrdersWithoutTable[0].id} to table ${tableId}`
        );
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
        } catch (error) {
          console.error('[handleTableChange] Error updating empty order:', error);
        }
      } else {
        console.log(`[handleTableChange] Creating new order for table ${tableId}`);
        const newId = Date.now() + Math.floor(Math.random() * 1000);
        const newOrder: Order = {
          id: newId,
          tableNumber: tableId,
          status: 'inProgress',
          ticketPath: '',
          paymentMethod: 'efectivo',
          items: [],
          total: 0,
          date: new Date().toISOString().split('T')[0],
          itemCount: 0,
          totalPaid: 0,
          change: 0,
        };

        try {
          await dataService.createOrder(newOrder);
          setState(
            produce((s) => {
              s.activeOrders.push(newOrder);
              s.selectedOrderId = newOrder.id;
              s.selectedOrder = newOrder;
            })
          );
        } catch (error) {
          console.error('[handleTableChange] Error creating new order:', error);
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
        if (s.selectedOrderId === orderId) {
          s.selectedOrderId = s.activeOrders.length > 0 ? s.activeOrders[0].id : null;
        }
      })
    );
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
    }
  };

  const removeFromOrder = async (orderId: number, productId: number) => {
    console.log(`[removeFromOrder] Removing product ${productId} from order ${orderId}`);

    setState(
      produce((s) => {
        const orderIndex = s.activeOrders.findIndex((order) => order.id === orderId);
        if (orderIndex !== -1) {
          const order = s.activeOrders[orderIndex];
          const existingItemIndex = order.items.findIndex((item) => item.id === productId);

          if (existingItemIndex !== -1) {
            const item = order.items[existingItemIndex];
            console.log(
              `[removeFromOrder] Current item: ${item.name}, quantity: ${item.quantity}, price: ${item.price}`
            );

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

            console.log(
              `[removeFromOrder] New totals: total=${order.total}, itemCount=${order.itemCount}`
            );
          }
        }
      })
    );

    const updatedOrder = state.activeOrders.find((order) => order.id === orderId);
    if (updatedOrder) {
      try {
        const dataService = storageAdapter();
        await dataService.updateOrder(updatedOrder);
      } catch (error) {
        console.error('[removeFromOrder] Error updating order:', error);
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
