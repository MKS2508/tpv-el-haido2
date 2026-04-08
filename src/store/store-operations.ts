/**
 * Store Operations
 *
 * Pure functions for store operations that return Result<T, ErrorCode>.
 * Separates side effects from state management.
 *
 * Operations are categorized as:
 * - Read: Load data from storage (TransactionState)
 * - Write: Create/update/delete data (OperationState)
 */

import { createContextLogger } from '@/lib/logger';
import type Category from '@/models/Category';
import type Customer from '@/models/Customer';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import type User from '@/models/User';
import type { IStorageAdapter, StorageResult } from '@/services/storage-adapter.interface';

const log = createContextLogger('StoreOperations');

/**
 * READ OPERATIONS (TransactionState)
 * Load data from storage
 */

/**
 * Load all users from storage
 */
export async function loadUsers(adapter: IStorageAdapter): Promise<StorageResult<User[]>> {
  log.debug('Loading users');
  const result = await adapter.getUsers();

  if (!result.ok) {
    log.resultError('loadUsers', result.error);
    return result;
  }

  log.success('loadUsers', { count: result.value.length });
  return result;
}

/**
 * Load all products from storage
 */
export async function loadProducts(adapter: IStorageAdapter): Promise<StorageResult<Product[]>> {
  log.debug('Loading products');
  const result = await adapter.getProducts();

  if (!result.ok) {
    log.resultError('loadProducts', result.error);
    return result;
  }

  log.success('loadProducts', { count: result.value.length });
  return result;
}

/**
 * Load all categories from storage
 */
export async function loadCategories(adapter: IStorageAdapter): Promise<StorageResult<Category[]>> {
  log.debug('Loading categories');
  const result = await adapter.getCategories();

  if (!result.ok) {
    log.resultError('loadCategories', result.error);
    return result;
  }

  log.success('loadCategories', { count: result.value.length });
  return result;
}

/**
 * Load all tables from storage
 */
export async function loadTables(adapter: IStorageAdapter): Promise<StorageResult<ITable[]>> {
  log.debug('Loading tables');

  if (!adapter.getTables) {
    return { ok: true, value: [] };
  }

  const result = await adapter.getTables();

  if (!result.ok) {
    log.resultError('loadTables', result.error);
    return result;
  }

  log.success('loadTables', { count: result.value.length });
  return result;
}

/**
 * Load all customers from storage
 */
export async function loadCustomers(adapter: IStorageAdapter): Promise<StorageResult<Customer[]>> {
  log.debug('Loading customers');

  if (!adapter.getCustomers) {
    return { ok: true, value: [] };
  }

  const result = await adapter.getCustomers();

  if (!result.ok) {
    log.resultError('loadCustomers', result.error);
    return result;
  }

  log.success('loadCustomers', { count: result.value.length });
  return result;
}

/**
 * Load all orders from storage
 */
export async function loadOrderHistory(adapter: IStorageAdapter): Promise<StorageResult<Order[]>> {
  log.debug('Loading order history');
  const result = await adapter.getOrders();

  if (!result.ok) {
    log.resultError('loadOrderHistory', result.error);
    return result;
  }

  log.success('loadOrderHistory', { count: result.value.length });
  return result;
}

/**
 * WRITE OPERATIONS (OperationState)
 * Create/update/delete data
 */

/**
 * Create a new customer
 */
export async function createCustomer(
  customer: Customer,
  adapter: IStorageAdapter
): Promise<StorageResult<void>> {
  log.debug('Creating customer', { customerId: customer.id, nombreFiscal: customer.nombreFiscal });

  if (!adapter.createCustomer) {
    return { ok: true, value: undefined };
  }

  const result = await adapter.createCustomer(customer);

  if (!result.ok) {
    log.resultError('createCustomer', result.error);
    return result;
  }

  log.success('createCustomer', { customerId: customer.id });
  return result;
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  customer: Customer,
  adapter: IStorageAdapter
): Promise<StorageResult<void>> {
  log.debug('Updating customer', { customerId: customer.id });

  if (!adapter.updateCustomer) {
    return { ok: true, value: undefined };
  }

  const result = await adapter.updateCustomer(customer);

  if (!result.ok) {
    log.resultError('updateCustomer', result.error);
    return result;
  }

  log.success('updateCustomer', { customerId: customer.id });
  return result;
}

/**
 * Delete a customer
 */
export async function deleteCustomer(
  customer: Customer,
  adapter: IStorageAdapter
): Promise<StorageResult<void>> {
  log.debug('Deleting customer', { customerId: customer.id });

  if (!adapter.deleteCustomer) {
    return { ok: true, value: undefined };
  }

  const result = await adapter.deleteCustomer(customer);

  if (!result.ok) {
    log.resultError('deleteCustomer', result.error);
    return result;
  }

  log.success('deleteCustomer', { customerId: customer.id });
  return result;
}

/**
 * Update an order
 */
export async function updateOrder(
  order: Order,
  adapter: IStorageAdapter
): Promise<StorageResult<void>> {
  log.debug('Updating order', { orderId: order.id });

  const result = await adapter.updateOrder(order);

  if (!result.ok) {
    log.resultError('updateOrder', result.error);
    return result;
  }

  log.success('updateOrder', { orderId: order.id });
  return result;
}

/**
 * Create a new order
 */
export async function createOrder(
  order: Order,
  adapter: IStorageAdapter
): Promise<StorageResult<void>> {
  log.debug('Creating order', { orderId: order.id, tableNumber: order.tableNumber });

  const result = await adapter.createOrder(order);

  if (!result.ok) {
    log.resultError('createOrder', result.error);
    return result;
  }

  log.success('createOrder', { orderId: order.id });
  return result;
}

/**
 * Delete an order
 */
export async function deleteOrder(
  order: Order,
  adapter: IStorageAdapter
): Promise<StorageResult<void>> {
  log.debug('Deleting order', { orderId: order.id });

  const result = await adapter.deleteOrder(order);

  if (!result.ok) {
    log.resultError('deleteOrder', result.error);
    return result;
  }

  log.success('deleteOrder', { orderId: order.id });
  return result;
}
