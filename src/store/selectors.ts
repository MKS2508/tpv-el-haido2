// Selectores optimizados para evitar re-renders innecesarios
import { useCallback } from 'react';
import type { AppState } from './store';
import useStore from './store';

// Hook personalizado para selectores memoizados
export const useStoreSelector = <T>(selector: (state: AppState) => T) => {
  return useStore(useCallback(selector, [selector]));
};

// Selectores específicos por dominio - evita re-renders masivos

// 🎯 USUARIOS - Solo para componentes que necesitan usuarios
export const useUsers = () => useStoreSelector((state) => state.users);
export const useSelectedUser = () => useStoreSelector((state) => state.selectedUser);
export const useSetSelectedUser = () => useStoreSelector((state) => state.setSelectedUser);
export const useSetUsers = () => useStoreSelector((state) => state.setUsers);

// 🛒 PRODUCTOS - Solo para componentes de productos
export const useProducts = () => useStoreSelector((state) => state.products);
export const useRecentProducts = () => useStoreSelector((state) => state.recentProducts);
export const useCategories = () => useStoreSelector((state) => state.categories);
export const useSetProducts = () => useStoreSelector((state) => state.setProducts);
export const useSetRecentProducts = () => useStoreSelector((state) => state.setRecentProducts);
export const useSetCategories = () => useStoreSelector((state) => state.setCategories);

// 🧾 ÓRDENES - Solo para componentes de órdenes
export const useActiveOrders = () => useStoreSelector((state) => state.activeOrders);
export const useOrderHistory = () => useStoreSelector((state) => state.orderHistory);
export const useSelectedOrder = () => useStoreSelector((state) => state.selectedOrder);
export const useSelectedOrderId = () => useStoreSelector((state) => state.selectedOrderId);
export const useSetActiveOrders = () => useStoreSelector((state) => state.setActiveOrders);
export const useSetOrderHistory = () => useStoreSelector((state) => state.setOrderHistory);
export const useSetSelectedOrder = () => useStoreSelector((state) => state.setSelectedOrder);
export const useSetSelectedOrderId = () => useStoreSelector((state) => state.setSelectedOrderId);

// 🍽️ MESAS - Solo para componentes de mesas
export const useTables = () => useStoreSelector((state) => state.tables);
export const useSetTables = () => useStoreSelector((state) => state.setTables);

// 💳 PAGOS - Solo para componentes de pago
export const usePaymentMethod = () => useStoreSelector((state) => state.paymentMethod);
export const useCashAmount = () => useStoreSelector((state) => state.cashAmount);
export const useShowTicketDialog = () => useStoreSelector((state) => state.showTicketDialog);
export const useSetPaymentMethod = () => useStoreSelector((state) => state.setPaymentMethod);
export const useSetCashAmount = () => useStoreSelector((state) => state.setCashAmount);
export const useSetShowTicketDialog = () => useStoreSelector((state) => state.setShowTicketDialog);

// ⚙️ CONFIGURACIÓN - Solo para configuración
export const useThermalPrinterOptions = () =>
  useStoreSelector((state) => state.thermalPrinterOptions);
export const useStorageMode = () => useStoreSelector((state) => state.storageMode);
export const useUseStockImages = () => useStoreSelector((state) => state.useStockImages);
export const useTouchOptimizationsEnabled = () =>
  useStoreSelector((state) => state.touchOptimizationsEnabled);
export const useDebugMode = () => useStoreSelector((state) => state.debugMode);
export const useIsBackendConnected = () => useStoreSelector((state) => state.isBackendConnected);

// ⚙️ SETTERS DE CONFIGURACIÓN
export const useSetThermalPrinterOptions = () =>
  useStoreSelector((state) => state.setThermalPrinterOptions);
export const useSetStorageMode = () => useStoreSelector((state) => state.setStorageMode);
export const useSetUseStockImages = () => useStoreSelector((state) => state.setUseStockImages);
export const useSetTouchOptimizationsEnabled = () =>
  useStoreSelector((state) => state.setTouchOptimizationsEnabled);
export const useSetDebugMode = () => useStoreSelector((state) => state.setDebugMode);
export const useSetBackendConnected = () => useStoreSelector((state) => state.setBackendConnected);

// 🔄 ACCIONES COMPLEJAS - Para operaciones que necesitan múltiples partes del state
export const useOrderActions = () =>
  useStoreSelector((state) => ({
    addToOrder: state.addToOrder,
    removeFromOrder: state.removeFromOrder,
    handleTableChange: state.handleTableChange,
    handleCompleteOrder: state.handleCompleteOrder,
    closeOrder: state.closeOrder,
  }));

// 📊 SELECTORES COMPUTADOS - Memoizados internamente en el store
export const useOrderStats = () =>
  useStoreSelector((state) => {
    const totalOrders = state.orderHistory.length;
    const totalSales = state.orderHistory.reduce((total, order) => total + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalOrders,
      totalSales,
      averageOrderValue,
    };
  });

export const useActiveOrdersCount = () => useStoreSelector((state) => state.activeOrders.length);

export const useProductsCount = () => useStoreSelector((state) => state.products.length);

// 🎯 SELECTORES ESPECÍFICOS POR COMPONENTE

// Para App.tsx - Solo lo que necesita
export const useAppData = () =>
  useStoreSelector((state) => ({
    users: state.users,
    selectedUser: state.selectedUser,
    selectedOrder: state.selectedOrder,
    thermalPrinterOptions: state.thermalPrinterOptions,
    tables: state.tables,
    categories: state.categories,
    products: state.products,
    touchOptimizationsEnabled: state.touchOptimizationsEnabled,
    debugMode: state.debugMode,
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
  }));

// Para Home.tsx - Solo estadísticas
export const useHomeData = () =>
  useStoreSelector((state) => ({
    orderHistory: state.orderHistory,
  }));

// Para Products.tsx - Solo productos y categorías
export const useProductsData = () =>
  useStoreSelector((state) => ({
    users: state.users,
    selectedUser: state.selectedUser,
    products: state.products,
    setProducts: state.setProducts,
    setUsers: state.setUsers,
    setSelectedUser: state.setSelectedUser,
  }));

// Para NewOrder.tsx - Todo lo relacionado con órdenes
export const useNewOrderData = () =>
  useStoreSelector((state) => ({
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
  }));

// Para OrderHistory.tsx - Solo historial
export const useOrderHistoryData = () =>
  useStoreSelector((state) => ({
    orderHistory: state.orderHistory,
    activeOrders: state.activeOrders,
    setOrderHistory: state.setOrderHistory,
  }));
