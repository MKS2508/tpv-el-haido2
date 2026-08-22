import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type User from '@/models/User';
import type { PlatformService } from '@/services/platform/PlatformService';
import { SqliteStorageAdapter } from '@/services/sqlite-storage-adapter';

/**
 * Tests for the SqliteStorageAdapter.
 *
 * The adapter now delegates all 23 Tauri commands to PlatformService, so the
 * mocking layer switched from `@tauri-apps/api/core` `invoke` to the platform
 * service. Every test preserves its original semantic intent (input/output
 * expectations, error paths) — only the mocking mechanism changed.
 */
describe('SqliteStorageAdapter', () => {
  let adapter: SqliteStorageAdapter;
  let platform: {
    [K in keyof PlatformService]: ReturnType<typeof vi.fn>;
  };

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
    platform = {
      // Methods exercised by this adapter
      getProducts: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      getCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      getOrders: vi.fn(),
      createOrder: vi.fn(),
      updateOrder: vi.fn(),
      deleteOrder: vi.fn(),
      getTables: vi.fn(),
      createTable: vi.fn(),
      updateTable: vi.fn(),
      deleteTable: vi.fn(),
      getUsers: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      clearAllData: vi.fn(),
      exportData: vi.fn(),
      importData: vi.fn(),

      // Methods on the interface that this adapter does not call — stubbed
      // so the cast `as unknown as PlatformService` is structurally valid.
      printTicket: vi.fn(),
      printReceipt: vi.fn(),
      openFileDialog: vi.fn(),
      saveFileDialog: vi.fn(),
      checkForUpdates: vi.fn(),
      downloadAndInstall: vi.fn(),
      isTauri: vi.fn(),
      getVersion: vi.fn(),
      canUseLicenseSystem: vi.fn(),
      checkLicense: vi.fn(),
      validateLicense: vi.fn(),
      clearLicense: vi.fn(),
      getMachineFingerprint: vi.fn(),
    } as unknown as {
      [K in keyof PlatformService]: ReturnType<typeof vi.fn>;
    };

    adapter = new SqliteStorageAdapter(platform as unknown as PlatformService);
  });

  describe('products', () => {
    it('getProducts delega en platform.getProducts y devuelve ok(value)', async () => {
      platform.getProducts.mockResolvedValueOnce({ ok: true, value: [product] });

      const result = await adapter.getProducts();

      expect(platform.getProducts).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([product]);
    });

    it('createProduct devuelve err(WriteFailed) si platform.createProduct devuelve error', async () => {
      platform.createProduct.mockResolvedValueOnce({
        ok: false,
        error: { code: 'BACKEND_FAILED', message: 'db locked' },
      });

      const result = await adapter.createProduct(product);

      expect(platform.createProduct).toHaveBeenCalledWith(product);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('STORAGE_WRITE_FAILED');
    });

    it('updateProduct delega en platform.updateProduct y devuelve ok(undefined)', async () => {
      platform.updateProduct.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.updateProduct(product);

      expect(platform.updateProduct).toHaveBeenCalledWith(product);
      expect(result.ok).toBe(true);
    });

    it('deleteProduct delega en platform.deleteProduct con el product y devuelve ok(undefined)', async () => {
      platform.deleteProduct.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.deleteProduct(product);

      expect(platform.deleteProduct).toHaveBeenCalledWith(product);
      expect(result.ok).toBe(true);
    });
  });

  describe('categories', () => {
    it('getCategories devuelve ok(value)', async () => {
      platform.getCategories.mockResolvedValueOnce({ ok: true, value: [category] });

      const result = await adapter.getCategories();

      expect(platform.getCategories).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([category]);
    });

    it('createCategory delega en platform.createCategory', async () => {
      platform.createCategory.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.createCategory(category);

      expect(platform.createCategory).toHaveBeenCalledWith(category);
      expect(result.ok).toBe(true);
    });

    it('updateCategory delega en platform.updateCategory', async () => {
      platform.updateCategory.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.updateCategory(category);

      expect(platform.updateCategory).toHaveBeenCalledWith(category);
      expect(result.ok).toBe(true);
    });

    it('deleteCategory devuelve err(DeleteFailed) si platform.deleteCategory devuelve error', async () => {
      platform.deleteCategory.mockResolvedValueOnce({
        ok: false,
        error: { code: 'BACKEND_FAILED', message: 'fk constraint' },
      });

      const result = await adapter.deleteCategory(category);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('STORAGE_DELETE_FAILED');
    });
  });

  describe('orders', () => {
    it('getOrders devuelve ok(value)', async () => {
      platform.getOrders.mockResolvedValueOnce({ ok: true, value: [order] });

      const result = await adapter.getOrders();

      expect(platform.getOrders).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([order]);
    });

    it('createOrder delega en platform.createOrder', async () => {
      platform.createOrder.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.createOrder(order);

      expect(platform.createOrder).toHaveBeenCalledWith(order);
      expect(result.ok).toBe(true);
    });

    it('updateOrder delega en platform.updateOrder', async () => {
      platform.updateOrder.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.updateOrder(order);

      expect(platform.updateOrder).toHaveBeenCalledWith(order);
      expect(result.ok).toBe(true);
    });

    it('deleteOrder delega en platform.deleteOrder con el order', async () => {
      platform.deleteOrder.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.deleteOrder(order);

      expect(platform.deleteOrder).toHaveBeenCalledWith(order);
      expect(result.ok).toBe(true);
    });
  });

  describe('tables', () => {
    it('getTables devuelve ok(value)', async () => {
      platform.getTables.mockResolvedValueOnce({ ok: true, value: [table] });

      const result = await adapter.getTables();

      expect(platform.getTables).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([table]);
    });

    it('createTable delega en platform.createTable', async () => {
      platform.createTable.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.createTable(table);

      expect(platform.createTable).toHaveBeenCalledWith(table);
      expect(result.ok).toBe(true);
    });

    it('updateTable delega en platform.updateTable', async () => {
      platform.updateTable.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.updateTable(table);

      expect(platform.updateTable).toHaveBeenCalledWith(table);
      expect(result.ok).toBe(true);
    });

    it('deleteTable delega en platform.deleteTable con el table', async () => {
      platform.deleteTable.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.deleteTable(table);

      expect(platform.deleteTable).toHaveBeenCalledWith(table);
      expect(result.ok).toBe(true);
    });
  });

  describe('users', () => {
    it('getUsers devuelve ok(value)', async () => {
      platform.getUsers.mockResolvedValueOnce({ ok: true, value: [user] });

      const result = await adapter.getUsers();

      expect(platform.getUsers).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([user]);
    });

    it('createUser delega en platform.createUser', async () => {
      platform.createUser.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.createUser(user);

      expect(platform.createUser).toHaveBeenCalledWith(user);
      expect(result.ok).toBe(true);
    });

    it('updateUser delega en platform.updateUser', async () => {
      platform.updateUser.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.updateUser(user);

      expect(platform.updateUser).toHaveBeenCalledWith(user);
      expect(result.ok).toBe(true);
    });

    it('deleteUser delega en platform.deleteUser con el user', async () => {
      platform.deleteUser.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.deleteUser(user);

      expect(platform.deleteUser).toHaveBeenCalledWith(user);
      expect(result.ok).toBe(true);
    });
  });

  describe('utility', () => {
    it('clearAllData delega en platform.clearAllData', async () => {
      platform.clearAllData.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.clearAllData();

      expect(platform.clearAllData).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
    });

    it('exportData devuelve ok(value) con products/categories/orders', async () => {
      const exported = { products: [product], categories: [category], orders: [order] };
      platform.exportData.mockResolvedValueOnce({ ok: true, value: exported });

      const result = await adapter.exportData();

      expect(platform.exportData).toHaveBeenCalledWith();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(exported);
    });

    it('importData delega en platform.importData con el payload completo', async () => {
      const data = { products: [product], categories: [category], orders: [order] };
      platform.importData.mockResolvedValueOnce({ ok: true, value: undefined });

      const result = await adapter.importData(data);

      expect(platform.importData).toHaveBeenCalledWith(data);
      expect(result.ok).toBe(true);
    });
  });
});
