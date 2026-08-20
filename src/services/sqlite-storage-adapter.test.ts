import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type User from '@/models/User';
import { SqliteStorageAdapter } from '@/services/sqlite-storage-adapter';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('SqliteStorageAdapter', () => {
  let adapter: SqliteStorageAdapter;

  const product: Product = {
    id: 1,
    name: 'Cafe',
    price: 1.5,
    category: 'bebidas',
    brand: '',
    iconType: '',
    selectedIcon: '',
    uploadedImage: null,
  };

  const category: Category = { id: 1, name: 'Bebidas', description: 'Bebidas frias y calientes' };

  const order: Order = {
    id: 1,
    date: '2026-08-20',
    total: 10,
    change: 0,
    totalPaid: 10,
    itemCount: 1,
    tableNumber: 1,
    paymentMethod: 'efectivo',
    ticketPath: '',
    status: 'paid',
    items: [{ id: 1, name: 'Cafe', price: 10, quantity: 1, category: 'bebidas' }],
  };

  const table: Table = { id: 1, name: 'Mesa 1', available: true };

  const user: User = { id: 1, name: 'Waxin', profilePicture: '', pin: '1234' };

  beforeEach(() => {
    adapter = new SqliteStorageAdapter();
    vi.mocked(invoke).mockReset();
  });

  describe('products', () => {
    it('getProducts delega en el comando Tauri get_products y devuelve ok(value)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([product]);

      const result = await adapter.getProducts();

      expect(invoke).toHaveBeenCalledWith('get_products');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([product]);
    });

    it('createProduct devuelve err(WriteFailed) si el comando Tauri rechaza', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('db locked'));

      const result = await adapter.createProduct(product);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('STORAGE_WRITE_FAILED');
    });

    it('updateProduct delega en update_product y devuelve ok(undefined)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.updateProduct(product);

      expect(invoke).toHaveBeenCalledWith('update_product', { product });
      expect(result.ok).toBe(true);
    });

    it('deleteProduct delega en delete_product con el id y devuelve ok(undefined)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.deleteProduct(product);

      expect(invoke).toHaveBeenCalledWith('delete_product', { id: product.id });
      expect(result.ok).toBe(true);
    });
  });

  describe('categories', () => {
    it('getCategories devuelve ok(value)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([category]);

      const result = await adapter.getCategories();

      expect(invoke).toHaveBeenCalledWith('get_categories');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([category]);
    });

    it('createCategory delega en create_category', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.createCategory(category);

      expect(invoke).toHaveBeenCalledWith('create_category', { category });
      expect(result.ok).toBe(true);
    });

    it('updateCategory delega en update_category', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.updateCategory(category);

      expect(invoke).toHaveBeenCalledWith('update_category', { category });
      expect(result.ok).toBe(true);
    });

    it('deleteCategory devuelve err(DeleteFailed) si el comando Tauri rechaza', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('fk constraint'));

      const result = await adapter.deleteCategory(category);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('STORAGE_DELETE_FAILED');
    });
  });

  describe('orders', () => {
    it('getOrders devuelve ok(value)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([order]);

      const result = await adapter.getOrders();

      expect(invoke).toHaveBeenCalledWith('get_orders');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([order]);
    });

    it('createOrder delega en create_order', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.createOrder(order);

      expect(invoke).toHaveBeenCalledWith('create_order', { order });
      expect(result.ok).toBe(true);
    });

    it('updateOrder delega en update_order', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.updateOrder(order);

      expect(invoke).toHaveBeenCalledWith('update_order', { order });
      expect(result.ok).toBe(true);
    });

    it('deleteOrder delega en delete_order con el id', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.deleteOrder(order);

      expect(invoke).toHaveBeenCalledWith('delete_order', { id: order.id });
      expect(result.ok).toBe(true);
    });
  });

  describe('tables', () => {
    it('getTables devuelve ok(value)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([table]);

      const result = await adapter.getTables();

      expect(invoke).toHaveBeenCalledWith('get_tables');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([table]);
    });

    it('createTable delega en create_table', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.createTable(table);

      expect(invoke).toHaveBeenCalledWith('create_table', { table });
      expect(result.ok).toBe(true);
    });

    it('updateTable delega en update_table', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.updateTable(table);

      expect(invoke).toHaveBeenCalledWith('update_table', { table });
      expect(result.ok).toBe(true);
    });

    it('deleteTable delega en delete_table con el id', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.deleteTable(table);

      expect(invoke).toHaveBeenCalledWith('delete_table', { id: table.id });
      expect(result.ok).toBe(true);
    });
  });

  describe('users', () => {
    it('getUsers devuelve ok(value)', async () => {
      vi.mocked(invoke).mockResolvedValueOnce([user]);

      const result = await adapter.getUsers();

      expect(invoke).toHaveBeenCalledWith('get_users');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([user]);
    });

    it('createUser delega en create_user', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.createUser(user);

      expect(invoke).toHaveBeenCalledWith('create_user', { user });
      expect(result.ok).toBe(true);
    });

    it('updateUser delega en update_user', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.updateUser(user);

      expect(invoke).toHaveBeenCalledWith('update_user', { user });
      expect(result.ok).toBe(true);
    });

    it('deleteUser delega en delete_user con el id', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.deleteUser(user);

      expect(invoke).toHaveBeenCalledWith('delete_user', { id: user.id });
      expect(result.ok).toBe(true);
    });
  });

  describe('utility', () => {
    it('clearAllData delega en clear_all_data', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.clearAllData();

      expect(invoke).toHaveBeenCalledWith('clear_all_data');
      expect(result.ok).toBe(true);
    });

    it('exportData devuelve ok(value) con products/categories/orders', async () => {
      const exported = { products: [product], categories: [category], orders: [order] };
      vi.mocked(invoke).mockResolvedValueOnce(exported);

      const result = await adapter.exportData();

      expect(invoke).toHaveBeenCalledWith('export_data');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(exported);
    });

    it('importData delega en import_data con el payload completo', async () => {
      const data = { products: [product], categories: [category], orders: [order] };
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      const result = await adapter.importData(data);

      expect(invoke).toHaveBeenCalledWith('import_data', { data });
      expect(result.ok).toBe(true);
    });
  });
});
