/**
 * useStoreOperations
 *
 * Hook wrappers for store-operations with OperationState / TransactionState.
 *
 * READ operations  → TransactionState (initial → loading → success | failed)
 * WRITE operations → OperationState   (idle → pending → success | failed)
 *
 * All hooks call store-operations.ts functions and keep the store in sync.
 */

import { ok } from '@mks2508/no-throw';
import { createContextLogger } from '@/lib/logger';
import { createOperationStateSignal, createTransactionStateSignal } from '@/lib/state-helpers';
import type Category from '@/models/Category';
import type Customer from '@/models/Customer';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import type User from '@/models/User';
import useStore from '@/store/store';
import {
  loadCategories,
  loadCustomers,
  loadOrderHistory,
  loadProducts,
  loadTables,
  loadUsers,
  createCustomer as opCreateCustomer,
  createOrder as opCreateOrder,
  deleteCustomer as opDeleteCustomer,
  deleteOrder as opDeleteOrder,
  updateCustomer as opUpdateCustomer,
  updateOrder as opUpdateOrder,
} from '@/store/store-operations';

const log = createContextLogger('useStoreOperations');

// ==================== READ / Loader hooks (TransactionState) ====================

/**
 * Load and cache products from storage.
 * Sets store.products on success.
 */
export function useProductsLoader() {
  const store = useStore();
  const tx = createTransactionStateSignal<Product[]>();

  const load = () =>
    tx.execute(async () => {
      const result = await loadProducts(store.storageAdapter());
      if (result.ok) store.setProducts(result.value);
      return result;
    });

  const refetch = () =>
    tx.refetch(async () => {
      const result = await loadProducts(store.storageAdapter());
      if (result.ok) store.setProducts(result.value);
      return result;
    });

  return { state: tx.state, load, refetch };
}

/**
 * Load and cache categories from storage.
 * Sets store.categories on success.
 */
export function useCategoriesLoader() {
  const store = useStore();
  const tx = createTransactionStateSignal<Category[]>();

  const load = () =>
    tx.execute(async () => {
      const result = await loadCategories(store.storageAdapter());
      if (result.ok) store.setCategories(result.value);
      return result;
    });

  return { state: tx.state, load };
}

/**
 * Load and cache order history from storage.
 * Sets store.orderHistory on success.
 */
export function useOrderHistoryLoader() {
  const store = useStore();
  const tx = createTransactionStateSignal<Order[]>();

  const load = () =>
    tx.execute(async () => {
      const result = await loadOrderHistory(store.storageAdapter());
      if (result.ok) store.setOrderHistory(result.value);
      return result;
    });

  const refetch = () =>
    tx.refetch(async () => {
      const result = await loadOrderHistory(store.storageAdapter());
      if (result.ok) store.setOrderHistory(result.value);
      return result;
    });

  return { state: tx.state, load, refetch };
}

/**
 * Load and cache customers from storage.
 * Sets store.customers on success.
 */
export function useCustomersLoader() {
  const store = useStore();
  const tx = createTransactionStateSignal<Customer[]>();

  const load = () =>
    tx.execute(async () => {
      const result = await loadCustomers(store.storageAdapter());
      if (result.ok) store.setCustomers(result.value);
      return result;
    });

  return { state: tx.state, load };
}

/**
 * Load and cache users from storage.
 * Sets store.users on success.
 */
export function useUsersLoader() {
  const store = useStore();
  const tx = createTransactionStateSignal<User[]>();

  const load = () =>
    tx.execute(async () => {
      const result = await loadUsers(store.storageAdapter());
      if (result.ok) store.setUsers(result.value);
      return result;
    });

  return { state: tx.state, load };
}

/**
 * Load and cache tables from storage.
 * Sets store.tables on success.
 */
export function useTablesLoader() {
  const store = useStore();
  const tx = createTransactionStateSignal<ITable[]>();

  const load = () =>
    tx.execute(async () => {
      const result = await loadTables(store.storageAdapter());
      if (result.ok) store.setTables(result.value);
      return result;
    });

  return { state: tx.state, load };
}

// ==================== WRITE / Mutation hooks (OperationState) ====================

/**
 * Customer CRUD mutations with OperationState.
 *
 * Delegates to store.addCustomer / updateCustomer / deleteCustomer so audit
 * logging is preserved. Falls back to ok(undefined) when the storage adapter
 * does not support customers.
 */
export function useCustomersMutation() {
  const store = useStore();
  const createOp = createOperationStateSignal<void>();
  const updateOp = createOperationStateSignal<void>();
  const deleteOp = createOperationStateSignal<void>();

  const create = (customer: Customer) => {
    log.debug('Creating customer', { customerId: customer.id });
    return createOp.execute(async () => {
      const result = await store.addCustomer(customer);
      return result ?? ok(undefined);
    });
  };

  const update = (customer: Customer) => {
    log.debug('Updating customer', { customerId: customer.id });
    return updateOp.execute(async () => {
      const result = await store.updateCustomer(customer);
      return result ?? ok(undefined);
    });
  };

  const remove = (customerId: number) => {
    log.debug('Deleting customer', { customerId });
    return deleteOp.execute(async () => {
      const result = await store.deleteCustomer(customerId);
      return result ?? ok(undefined);
    });
  };

  return {
    createState: createOp.state,
    updateState: updateOp.state,
    deleteState: deleteOp.state,
    create,
    update,
    remove,
    resetCreate: createOp.reset,
    resetUpdate: updateOp.reset,
    resetDelete: deleteOp.reset,
  };
}

/**
 * Order CRUD mutations with OperationState.
 *
 * Reloads order history from storage after each successful mutation.
 * Does NOT handle active-order lifecycle (use store.addToOrder /
 * store.handleCompleteOrder / store.closeOrder for that).
 */
export function useOrdersMutation() {
  const store = useStore();
  const createOp = createOperationStateSignal<void>();
  const updateOp = createOperationStateSignal<void>();
  const deleteOp = createOperationStateSignal<void>();

  const reloadHistory = async () => {
    const reload = await loadOrderHistory(store.storageAdapter());
    if (reload.ok) store.setOrderHistory(reload.value);
  };

  const create = (order: Order) => {
    log.debug('Creating order', { orderId: order.id });
    return createOp.execute(async () => {
      const result = await opCreateOrder(order, store.storageAdapter());
      if (result.ok) await reloadHistory();
      return result;
    });
  };

  const update = (order: Order) => {
    log.debug('Updating order', { orderId: order.id });
    return updateOp.execute(async () => {
      const result = await opUpdateOrder(order, store.storageAdapter());
      if (result.ok) await reloadHistory();
      return result;
    });
  };

  const remove = (order: Order) => {
    log.debug('Deleting order', { orderId: order.id });
    return deleteOp.execute(async () => {
      const result = await opDeleteOrder(order, store.storageAdapter());
      if (result.ok) await reloadHistory();
      return result;
    });
  };

  return {
    createState: createOp.state,
    updateState: updateOp.state,
    deleteState: deleteOp.state,
    create,
    update,
    remove,
    resetCreate: createOp.reset,
    resetUpdate: updateOp.reset,
    resetDelete: deleteOp.reset,
  };
}

/**
 * Customer CRUD mutations that bypass the store and call storage directly.
 *
 * Use this when you need to manage the store state yourself (e.g., in
 * onboarding flows where the store may not yet be initialized).
 * NOTE: Does NOT emit audit events — use useCustomersMutation for normal flows.
 */
export function useRawCustomersMutation() {
  const store = useStore();
  const createOp = createOperationStateSignal<void>();
  const updateOp = createOperationStateSignal<void>();
  const deleteOp = createOperationStateSignal<void>();

  const create = (customer: Customer) =>
    createOp.execute(async () => {
      const result = await opCreateCustomer(customer, store.storageAdapter());
      if (result.ok) {
        const reload = await loadCustomers(store.storageAdapter());
        if (reload.ok) store.setCustomers(reload.value);
      }
      return result;
    });

  const update = (customer: Customer) =>
    updateOp.execute(async () => {
      const result = await opUpdateCustomer(customer, store.storageAdapter());
      if (result.ok) {
        const reload = await loadCustomers(store.storageAdapter());
        if (reload.ok) store.setCustomers(reload.value);
      }
      return result;
    });

  const remove = (customer: Customer) =>
    deleteOp.execute(async () => {
      const result = await opDeleteCustomer(customer, store.storageAdapter());
      if (result.ok) {
        const reload = await loadCustomers(store.storageAdapter());
        if (reload.ok) store.setCustomers(reload.value);
      }
      return result;
    });

  return {
    createState: createOp.state,
    updateState: updateOp.state,
    deleteState: deleteOp.state,
    create,
    update,
    remove,
    resetCreate: createOp.reset,
    resetUpdate: updateOp.reset,
    resetDelete: deleteOp.reset,
  };
}
