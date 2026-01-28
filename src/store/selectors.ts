// Selectores optimizados para evitar re-renders innecesarios
import { useShallow } from 'zustand/react/shallow';
import useStore from './store';

// Selectores específicos por dominio - evita re-renders masivos

// 🎯 USUARIOS - Solo para componentes que necesitan usuarios
export const useUsers = () => useStore((state) => state.users);
export const useSelectedUser = () => useStore((state) => state.selectedUser);
export const useSetSelectedUser = () => useStore((state) => state.setSelectedUser);
export const useSetUsers = () => useStore((state) => state.setUsers);

// 🛒 PRODUCTOS - Solo para componentes de productos
export const useProducts = () => useStore((state) => state.products);
export const useRecentProducts = () => useStore((state) => state.recentProducts);
export const useCategories = () => useStore((state) => state.categories);
export const useSetProducts = () => useStore((state) => state.setProducts);
export const useSetRecentProducts = () => useStore((state) => state.setRecentProducts);
export const useSetCategories = () => useStore((state) => state.setCategories);

// 🧾 ÓRDENES - Solo para componentes de órdenes
export const useActiveOrders = () => useStore((state) => state.activeOrders);
export const useOrderHistory = () => useStore((state) => state.orderHistory);
export const useSelectedOrder = () => useStore((state) => state.selectedOrder);
export const useSelectedOrderId = () => useStore((state) => state.selectedOrderId);
export const useSetActiveOrders = () => useStore((state) => state.setActiveOrders);
export const useSetOrderHistory = () => useStore((state) => state.setOrderHistory);
export const useSetSelectedOrder = () => useStore((state) => state.setSelectedOrder);
export const useSetSelectedOrderId = () => useStore((state) => state.setSelectedOrderId);

// 🍽️ MESAS - Solo para componentes de mesas
export const useTables = () => useStore((state) => state.tables);
export const useSetTables = () => useStore((state) => state.setTables);

// 💳 PAGOS - Solo para componentes de pago
export const usePaymentMethod = () => useStore((state) => state.paymentMethod);
export const useCashAmount = () => useStore((state) => state.cashAmount);
export const useShowTicketDialog = () => useStore((state) => state.showTicketDialog);
export const useSetPaymentMethod = () => useStore((state) => state.setPaymentMethod);
export const useSetCashAmount = () => useStore((state) => state.setCashAmount);
export const useSetShowTicketDialog = () => useStore((state) => state.setShowTicketDialog);

// ⚙️ CONFIGURACIÓN - Solo para configuración
export const useThermalPrinterOptions = () => useStore((state) => state.thermalPrinterOptions);
export const useStorageMode = () => useStore((state) => state.storageMode);
export const useUseStockImages = () => useStore((state) => state.useStockImages);
export const useTouchOptimizationsEnabled = () => useStore((state) => state.touchOptimizationsEnabled);
export const useDebugMode = () => useStore((state) => state.debugMode);
export const useIsBackendConnected = () => useStore((state) => state.isBackendConnected);

// ⚙️ SETTERS DE CONFIGURACIÓN
export const useSetThermalPrinterOptions = () => useStore((state) => state.setThermalPrinterOptions);
export const useSetStorageMode = () => useStore((state) => state.setStorageMode);
export const useSetUseStockImages = () => useStore((state) => state.setUseStockImages);
export const useSetTouchOptimizationsEnabled = () =>
  useStore((state) => state.setTouchOptimizationsEnabled);
export const useSetDebugMode = () => useStore((state) => state.setDebugMode);
export const useSetBackendConnected = () => useStore((state) => state.setBackendConnected);

// 🔄 ACCIONES COMPLEJAS - Para operaciones que necesitan múltiples partes del state
export const useOrderActions = () =>
  useStore(
    useShallow((state) => ({
      addToOrder: state.addToOrder,
      removeFromOrder: state.removeFromOrder,
      handleTableChange: state.handleTableChange,
      handleCompleteOrder: state.handleCompleteOrder,
      closeOrder: state.closeOrder,
    }))
  );

// 📊 SELECTORES COMPUTADOS - Memoizados internamente en el store
export const useOrderStats = () =>
  useStore(
    useShallow((state) => {
      const totalOrders = state.orderHistory.length;
      const totalSales = state.orderHistory.reduce((total, order) => total + order.total, 0);
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      return {
        totalOrders,
        totalSales,
        averageOrderValue,
      };
    })
  );

export const useActiveOrdersCount = () => useStore((state) => state.activeOrders.length);

export const useProductsCount = () => useStore((state) => state.products.length);

// 🎯 SELECTORES ESPECÍFICOS POR COMPONENTE

// Para App.tsx - Solo lo que necesita
export const useAppData = () =>
  useStore(
    useShallow((state) => ({
      users: state.users,
      selectedUser: state.selectedUser,
      selectedOrder: state.selectedOrder,
      thermalPrinterOptions: state.thermalPrinterOptions,
      tables: state.tables,
      categories: state.categories,
      products: state.products,
      touchOptimizationsEnabled: state.touchOptimizationsEnabled,
      debugMode: state.debugMode,
      storageAdapter: state.storageAdapter,
      setBackendConnected: state.setBackendConnected,
      setUsers: state.setUsers,
      setSelectedUser: state.setSelectedUser,
      setSelectedOrder: state.setSelectedOrder,
      setSelectedOrderId: state.setSelectedOrderId,
      setThermalPrinterOptions: state.setThermalPrinterOptions,
      setTables: state.setTables,
      setCategories: state.setCategories,
      setProducts: state.setProducts,
      setOrderHistory: state.setOrderHistory,
    }))
  );

// Para Home.tsx - Solo estadísticas
export const useHomeData = () =>
  useStore(
    useShallow((state) => ({
      orderHistory: state.orderHistory,
    }))
  );

// Para Products.tsx - Solo productos y categorías
export const useProductsData = () =>
  useStore(
    useShallow((state) => ({
      users: state.users,
      selectedUser: state.selectedUser,
      products: state.products,
      setProducts: state.setProducts,
      setUsers: state.setUsers,
      setSelectedUser: state.setSelectedUser,
      storageAdapter: state.storageAdapter,
    }))
  );

// Para NewOrder.tsx - Todo lo relacionado con órdenes
export const useNewOrderData = () =>
  useStore(
    useShallow((state) => ({
      activeOrders: state.activeOrders,
      recentProducts: state.recentProducts,
      products: state.products,
      selectedUser: state.selectedUser,
      tables: state.tables,
      thermalPrinterOptions: state.thermalPrinterOptions,
      categories: state.categories,
      orderHistory: state.orderHistory,
      selectedOrder: state.selectedOrder,
      selectedOrderId: state.selectedOrderId,
      paymentMethod: state.paymentMethod,
      cashAmount: state.cashAmount,
      showTicketDialog: state.showTicketDialog,
      setProducts: state.setProducts,
      setRecentProducts: state.setRecentProducts,
      setSelectedOrderId: state.setSelectedOrderId,
      setTables: state.setTables,
      addToOrder: state.addToOrder,
      removeFromOrder: state.removeFromOrder,
      handleTableChange: state.handleTableChange,
      handleCompleteOrder: state.handleCompleteOrder,
      closeOrder: state.closeOrder,
      setPaymentMethod: state.setPaymentMethod,
      setCashAmount: state.setCashAmount,
      setShowTicketDialog: state.setShowTicketDialog,
      setActiveOrders: state.setActiveOrders,
      setSelectedOrder: state.setSelectedOrder,
    }))
  );

// Para OrderHistory.tsx - Solo historial
export const useOrderHistoryData = () =>
  useStore(
    useShallow((state) => ({
      orderHistory: state.orderHistory,
      activeOrders: state.activeOrders,
      setOrderHistory: state.setOrderHistory,
    }))
  );
