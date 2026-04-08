/**
 * SolidJS Selectors - Computed memos for optimized reactivity
 *
 * In SolidJS, selectors are typically just createMemo wrappers.
 * Since solid-js/store is already fine-grained reactive, many of these
 * can be simplified to direct property access.
 */
import { createMemo } from 'solid-js';
import useStore from './store';

// Get the store instance
const store = useStore();

// === COMPUTED SELECTORS (createMemo) ===

// Order statistics
export const orderStats = createMemo(() => {
  const totalOrders = store.state.orderHistory.length;
  const totalSales = store.state.orderHistory.reduce((total, order) => total + order.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return {
    totalOrders,
    totalSales,
    averageOrderValue,
  };
});

export const activeOrdersCount = createMemo(() => store.state.activeOrders.length);

export const productsCount = createMemo(() => store.state.products.length);

// === DIRECT STATE ACCESS HELPERS ===
// In SolidJS with createStore, direct property access is already reactive
// These are convenience exports for common patterns

// Users
export const users = () => store.state.users;
export const selectedUser = () => store.state.selectedUser;

// Products
export const products = () => store.state.products;
export const recentProducts = () => store.state.recentProducts;
export const categories = () => store.state.categories;

// Customers
export const customers = () => store.state.customers;

// Orders
export const activeOrders = () => store.state.activeOrders;
export const orderHistory = () => store.state.orderHistory;
export const selectedOrder = () => store.state.selectedOrder;
export const selectedOrderId = () => store.state.selectedOrderId;

// Tables
export const tables = () => store.state.tables;

// Payments
export const paymentMethod = () => store.state.paymentMethod;
export const cashAmount = () => store.state.cashAmount;
export const showTicketDialog = () => store.state.showTicketDialog;

// Configuration
export const thermalPrinterOptions = () => store.state.thermalPrinterOptions;
export const storageMode = () => store.state.storageMode;
export const useStockImages = () => store.state.useStockImages;
export const touchOptimizationsEnabled = () => store.state.touchOptimizationsEnabled;
export const debugMode = () => store.state.debugMode;
export const isBackendConnected = () => store.state.isBackendConnected;
export const autoOpenCashDrawer = () => store.state.autoOpenCashDrawer;
export const taxRate = () => store.state.taxRate;

// === ACTION BUNDLES ===
// Group related actions for convenience

export const orderActions = {
  addToOrder: store.addToOrder,
  removeFromOrder: store.removeFromOrder,
  handleTableChange: store.handleTableChange,
  handleCompleteOrder: store.handleCompleteOrder,
  closeOrder: store.closeOrder,
};

// === COMPOSITE DATA SELECTORS ===
// For components that need multiple pieces of state

export const appData = createMemo(() => ({
  users: store.state.users,
  selectedUser: store.state.selectedUser,
  selectedOrder: store.state.selectedOrder,
  thermalPrinterOptions: store.state.thermalPrinterOptions,
  tables: store.state.tables,
  categories: store.state.categories,
  products: store.state.products,
  touchOptimizationsEnabled: store.state.touchOptimizationsEnabled,
  debugMode: store.state.debugMode,
}));

export const homeData = createMemo(() => ({
  orderHistory: store.state.orderHistory,
}));

export const productsData = createMemo(() => ({
  users: store.state.users,
  selectedUser: store.state.selectedUser,
  products: store.state.products,
}));

export const newOrderData = createMemo(() => ({
  activeOrders: store.state.activeOrders,
  recentProducts: store.state.recentProducts,
  products: store.state.products,
  selectedUser: store.state.selectedUser,
  tables: store.state.tables,
  thermalPrinterOptions: store.state.thermalPrinterOptions,
  categories: store.state.categories,
  orderHistory: store.state.orderHistory,
  selectedOrder: store.state.selectedOrder,
  selectedOrderId: store.state.selectedOrderId,
  paymentMethod: store.state.paymentMethod,
  cashAmount: store.state.cashAmount,
  showTicketDialog: store.state.showTicketDialog,
}));

export const orderHistoryData = createMemo(() => ({
  orderHistory: store.state.orderHistory,
  activeOrders: store.state.activeOrders,
}));
