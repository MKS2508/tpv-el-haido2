import { BeerIcon } from 'lucide-react';
import React from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import iconOptions from '@/assets/utils/icons/iconOptions';
import { config } from '@/lib/config';
import type Category from '@/models/Category';
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

// Debounce utility para localStorage
const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

// Debounced localStorage setters para reducir escrituras
const debouncedLocalStorageSet = debounce((key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
}, 300);

export interface AppState {
  users: User[];
  selectedUser: User | null;
  selectedOrder: Order | null;
  selectedOrderId: number | null;
  thermalPrinterOptions: ThermalPrinterServiceOptions | null;
  tables: ITable[];
  categories: Category[];
  products: Product[];
  orderHistory: Order[];
  paymentMethod: string;
  cashAmount: string;
  showTicketDialog: boolean;
  storageMode: StorageMode;
  storageAdapter: IStorageAdapter;
  useStockImages: boolean;
  touchOptimizationsEnabled: boolean; // New property
  debugMode: boolean;
  isBackendConnected: boolean;
  autoOpenCashDrawer: boolean;
  taxRate: number;
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  setSelectedOrder: (order: Order | null) => void;
  setSelectedOrderId: (orderId: number | null) => void;
  setThermalPrinterOptions: (options: ThermalPrinterServiceOptions | null) => void;
  setTables: (tables: ITable[]) => void;
  setCategories: (categories: Category[]) => void;
  setProducts: (products: Product[]) => void;
  setOrderHistory: (orderHistory: Order[]) => void;
  activeOrders: Order[];
  recentProducts: Product[];
  setActiveOrders: (activeOrders: Order[]) => void;
  addToOrder: (orderId: number, product: Product | OrderItem) => void;
  setRecentProducts: (recentProducts: Product[]) => void;
  removeFromOrder: (orderId: number, productId: number) => void;
  setPaymentMethod: (method: string) => void;
  setCashAmount: (amount: string) => void;
  setShowTicketDialog: (show: boolean) => void;
  setTouchOptimizationsEnabled: (enabled: boolean) => void; // New setter
  setStorageMode: (mode: StorageMode) => void;
  setUseStockImages: (use: boolean) => void;
  setDebugMode: (enabled: boolean) => void;
  setBackendConnected: (connected: boolean) => void;
  setAutoOpenCashDrawer: (enabled: boolean) => void;
  setTaxRate: (rate: number) => void;
  handleTableChange: (tableId: number) => void;
  handleCompleteOrder: (order: Order) => void;
  closeOrder: (orderId: number) => void;
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
  // First, check if there's a saved preference in localStorage
  try {
    const saved = localStorage.getItem('tpv-storage-mode') as StorageMode | null;
    if (saved === 'sqlite' || saved === 'http' || saved === 'indexeddb') {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }

  // If env variable is set, use that as default
  if (config.storage.defaultMode) {
    return config.storage.defaultMode;
  }

  // Otherwise, use smart defaults based on environment
  if (isTauri()) {
    // When running in Tauri, default to sqlite
    return 'sqlite';
  }

  // When running in browser (development), default to indexeddb
  return 'indexeddb';
};

// Get initial stock images setting from localStorage or default to true
const getInitialUseStockImages = (): boolean => {
  try {
    const saved = localStorage.getItem('tpv-use-stock-images');
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
};

// Get initial auto-open cash drawer setting from localStorage or default to false
const getInitialAutoOpenCashDrawer = (): boolean => {
  try {
    const saved = localStorage.getItem('tpv-auto-open-cash-drawer');
    return saved === 'true';
  } catch {
    return false;
  }
};

// Get initial tax rate from localStorage or default to 21 (Spain IVA)
const getInitialTaxRate = (): number => {
  try {
    const saved = localStorage.getItem('tpv-tax-rate');
    return saved !== null ? parseFloat(saved) : 21;
  } catch {
    return 21;
  }
};

const initialStorageMode = getInitialStorageMode();

const useStore = create(
  immer<AppState>((set, get) => ({
    users: [],
    selectedUser: null,
    selectedOrder: null,
    selectedOrderId: null,
    thermalPrinterOptions: null,
    tables: [],
    categories: [],
    products: [],
    storageMode: initialStorageMode,
    storageAdapter: getStorageAdapterForMode(initialStorageMode),
    useStockImages: getInitialUseStockImages(),
    debugMode: true, // Activado por defecto
    isBackendConnected: false,
    orderHistory: [
      {
        id: 1,
        date: '2023-03-01T00:00:00.000Z',
        total: 100,
        change: 0,
        totalPaid: 0,
        itemCount: 0,
        tableNumber: 0,
        paymentMethod: 'efectivo',
        ticketPath: '',
        status: 'paid',
        items: [
          {
            id: 1,
            name: 'Café solo ☕️',
            quantity: 1,
            price: 10,
            category: 'Cafés ☕️',
            brand: 'El Haido',
            icon: React.createElement(
              iconOptions.find((option) => option.value === 'CoffeeIcon')?.icon || BeerIcon
            ),
            iconType: 'preset',
            selectedIcon: '',
            uploadedImage: null,
          },
        ],
      },
    ],
    paymentMethod: 'efectivo',
    selectedLanguage: 'es',
    cashAmount: '',
    showTicketDialog: false,
    activeOrders: [],
    recentProducts: [],
    touchOptimizationsEnabled: false, // Initial state for touch optimizations
    autoOpenCashDrawer: getInitialAutoOpenCashDrawer(),
    taxRate: getInitialTaxRate(),
    // Methods
    setUsers: (users) =>
      set((state) => {
        state.users = users;
      }),
    setSelectedUser: (user) =>
      set((state) => {
        state.selectedUser = user;
      }),
    setSelectedOrder: (order) =>
      set((state) => {
        state.selectedOrder = order;
      }),
    setSelectedOrderId: (orderId) =>
      set((state) => {
        state.selectedOrderId = orderId;
        state.selectedOrder = state.activeOrders.find((o: Order) => o.id === orderId) || null;
      }),
    setThermalPrinterOptions: (options) =>
      set((state) => {
        state.thermalPrinterOptions = options;
      }),
    setTables: (tables) =>
      set((state) => {
        state.tables = tables;
      }),
    setCategories: (categories) =>
      set((state) => {
        state.categories = categories;
      }),
    setProducts: (products) =>
      set((state) => {
        // Deduplicar productos por ID para evitar duplicados
        const uniqueProducts = products.filter(
          (product, index, self) => index === self.findIndex((p) => p.id === product.id)
        );
        state.products = uniqueProducts;
      }),
    setOrderHistory: (orderHistory) =>
      set((state) => {
        state.orderHistory = orderHistory;
      }),
    setActiveOrders: (activeOrders) =>
      set((state) => {
        state.activeOrders = activeOrders;
      }),
    setRecentProducts: (recentProducts) =>
      set((state) => {
        state.recentProducts = recentProducts;
      }),
    setPaymentMethod: (method) =>
      set((state) => {
        state.paymentMethod = method;
      }),
    setCashAmount: (amount) =>
      set((state) => {
        state.cashAmount = amount;
      }),
    setShowTicketDialog: (show) =>
      set((state) => {
        state.showTicketDialog = show;
      }),
    setSelectedLanguage: (language: string) =>
      set((state) => {
        (state as any).selectedLanguage = language;
      }),
    setUseStockImages: (use: boolean) =>
      set((state) => {
        state.useStockImages = use;
        debouncedLocalStorageSet('tpv-use-stock-images', use.toString());
      }),
    setTouchOptimizationsEnabled: (enabled) =>
      set((state) => {
        state.touchOptimizationsEnabled = enabled;
        debouncedLocalStorageSet('tpv-touch-optimizations', enabled.toString());
      }),

    setDebugMode: (enabled) =>
      set((state) => {
        state.debugMode = enabled;
        debouncedLocalStorageSet('tpv-debug-mode', enabled.toString());
      }),

    setBackendConnected: (connected) =>
      set((state) => {
        state.isBackendConnected = connected;
      }),

    setAutoOpenCashDrawer: (enabled) =>
      set((state) => {
        state.autoOpenCashDrawer = enabled;
        debouncedLocalStorageSet('tpv-auto-open-cash-drawer', enabled.toString());
      }),

    setTaxRate: (rate) =>
      set((state) => {
        state.taxRate = rate;
        debouncedLocalStorageSet('tpv-tax-rate', rate.toString());
      }),

    // Storage management methods
    setStorageMode: (mode: StorageMode) =>
      set((state) => {
        state.storageMode = mode;
        state.storageAdapter = getStorageAdapterForMode(mode);
        localStorage.setItem('tpv-storage-mode', mode);
      }),
    getStorageAdapter: () => {
      const state = get();
      return state.storageAdapter;
    },

    handleTableChange: async (tableId: number) => {
      const state = get();
      const dataService = state.storageAdapter;
      console.log(`[handleTableChange] Changing to table ${tableId}`);

      // Buscar si ya existe una orden para esta mesa específica
      const existingOrder = state.activeOrders.find(
        (order: Order) => order.tableNumber === tableId && order.status === 'inProgress'
      );

      if (existingOrder) {
        console.log(
          `[handleTableChange] Found existing order ${existingOrder.id} for table ${tableId}`
        );
        set((state) => {
          state.selectedOrderId = existingOrder.id;
          state.selectedOrder = existingOrder;
        });
      } else {
        // Solo buscar órdenes vacías que NO tengan mesa asignada (tableNumber === 0 o null)
        const emptyOrdersWithoutTable = state.activeOrders.filter(
          (order: Order) =>
            order.items.length === 0 && (order.tableNumber === 0 || order.tableNumber === null)
        );

        if (emptyOrdersWithoutTable.length > 0) {
          console.log(
            `[handleTableChange] Assigning empty order ${emptyOrdersWithoutTable[0].id} to table ${tableId}`
          );
          const updatedOrder: Order = { ...emptyOrdersWithoutTable[0], tableNumber: tableId };

          try {
            await dataService.updateOrder(updatedOrder);
            set((state) => {
              const orderIndex = state.activeOrders.findIndex(
                (order: Order) => order.id === emptyOrdersWithoutTable[0].id
              );
              if (orderIndex !== -1) {
                state.activeOrders[orderIndex] = updatedOrder;
              }
              state.selectedOrderId = emptyOrdersWithoutTable[0].id;
              state.selectedOrder = updatedOrder;
            });
          } catch (error) {
            console.error('[handleTableChange] Error updating empty order:', error);
          }
        } else {
          console.log(`[handleTableChange] Creating new order for table ${tableId}`);
          // Generar ID único más robusto
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
            set((state) => {
              state.activeOrders.push(newOrder);
              state.selectedOrderId = newOrder.id;
              state.selectedOrder = newOrder;
            });
          } catch (error) {
            console.error('[handleTableChange] Error creating new order:', error);
          }
        }
      }
    },

    handleCompleteOrder: async (order: Order) => {
      const state = get();
      const dataService = state.storageAdapter;
      const currentOrder = state.activeOrders.find((o: Order) => o.id === order.id) || order;
      const completedOrder: Order = {
        ...currentOrder,
        status: 'paid',
        itemCount: currentOrder.items.reduce(
          (sum: number, item: { quantity: number }) => sum + item.quantity,
          0
        ),
        ticketPath: `/home/mks/WebStormProjects/tpv/tickets/ticket-${currentOrder.id}_${new Date().toISOString().split('T')[0]}.pdf`,
      };
      await dataService.updateOrder(completedOrder);
      set((state) => {
        state.orderHistory.push(completedOrder);
        state.activeOrders = state.activeOrders.filter((o: Order) => o.id !== completedOrder.id);
        state.paymentMethod = 'efectivo';
        state.cashAmount = '';
        state.showTicketDialog = false;
        state.selectedOrderId = null;
      });
    },

    closeOrder: async (orderId: number) => {
      const state = get();
      const dataService = state.storageAdapter;
      const orderToDelete = state.activeOrders.find((o: Order) => o.id === orderId);
      if (orderToDelete) {
        await dataService.deleteOrder(orderToDelete);
      }
      set((state) => {
        state.activeOrders = state.activeOrders.filter((o: Order) => o.id !== orderId);
        state.orderHistory = state.orderHistory.filter((o: Order) => o.id !== orderId);
        if (state.selectedOrderId === orderId) {
          state.selectedOrderId = state.activeOrders.length > 0 ? state.activeOrders[0].id : null;
        }
      });
    },

    addToOrder: async (orderId: number, item: Product | OrderItem) => {
      set((state) => {
        const orderIndex = state.activeOrders.findIndex((order: Order) => order.id === orderId);
        if (orderIndex !== -1) {
          const order = state.activeOrders[orderIndex];
          const existingItemIndex = order.items.findIndex(
            (orderItem: OrderItem) => orderItem.id === item.id
          );
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
      });
      const updatedOrder = get().activeOrders.find((order: Order) => order.id === orderId);
      if (updatedOrder) {
        const dataService = get().storageAdapter;
        await dataService.updateOrder(updatedOrder);
      }
    },

    removeFromOrder: async (orderId: number, productId: number) => {
      console.log(`[removeFromOrder] Removing product ${productId} from order ${orderId}`);

      set((state) => {
        const orderIndex = state.activeOrders.findIndex((order: Order) => order.id === orderId);
        if (orderIndex !== -1) {
          const order = state.activeOrders[orderIndex];
          const existingItemIndex = order.items.findIndex(
            (item: { id: number }) => item.id === productId
          );

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

            // Recalcular total desde cero para asegurar exactitud
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
      });

      const updatedOrder = get().activeOrders.find((order: Order) => order.id === orderId);
      if (updatedOrder) {
        try {
          const dataService = get().storageAdapter;
          await dataService.updateOrder(updatedOrder);
        } catch (error) {
          console.error('[removeFromOrder] Error updating order:', error);
        }
      }
    },
  }))
);

export default useStore;
