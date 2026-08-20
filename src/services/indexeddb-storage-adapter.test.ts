import { beforeEach, describe, expect, it } from 'vitest';
import type Category from '@/models/Category';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import type Table from '@/models/Table';
import type User from '@/models/User';
import { IndexedDbStorageAdapter } from '@/services/indexeddb-storage-adapter';

describe('IndexedDbStorageAdapter', () => {
  let adapter: IndexedDbStorageAdapter;

  beforeEach(() => {
    // Nueva instancia por test — cada una abre su propia conexión sobre la misma
    // fake-indexeddb en memoria (persiste entre tests del mismo proceso, ver Riesgos).
    adapter = new IndexedDbStorageAdapter();
  });

  describe('categories', () => {
    it('createCategory + getCategories hace round-trip real sobre la IndexedDB fake', async () => {
      const category: Category = { id: 500, name: 'Postres', description: 'Dulces' };

      const createResult = await adapter.createCategory(category);
      expect(createResult.ok).toBe(true);

      const getResult = await adapter.getCategories();
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.find((c) => c.id === 500)).toEqual(category);
      }
    });

    it('updateCategory sobrescribe el registro existente', async () => {
      const category: Category = { id: 502, name: 'Entrantes', description: 'Para picar' };
      await adapter.createCategory(category);

      const updated: Category = { ...category, description: 'Para compartir' };
      const updateResult = await adapter.updateCategory(updated);
      expect(updateResult.ok).toBe(true);

      const getResult = await adapter.getCategories();
      if (getResult.ok) {
        expect(getResult.value.find((c) => c.id === 502)).toEqual(updated);
      }
    });

    it('deleteCategory elimina el registro de la store', async () => {
      const category: Category = { id: 501, name: 'Snacks', description: 'Salados' };
      await adapter.createCategory(category);

      const deleteResult = await adapter.deleteCategory(category);
      expect(deleteResult.ok).toBe(true);

      const getResult = await adapter.getCategories();
      if (getResult.ok) {
        expect(getResult.value.find((c) => c.id === 501)).toBeUndefined();
      }
    });
  });

  describe('products', () => {
    const product: Product = {
      id: 100,
      name: 'Cafe',
      price: 1.5,
      category: 'bebidas',
      brand: '',
      iconType: '',
      selectedIcon: '',
      uploadedImage: null,
    };

    it('createProduct + getProducts hace round-trip real', async () => {
      const createResult = await adapter.createProduct(product);
      expect(createResult.ok).toBe(true);

      const getResult = await adapter.getProducts();
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.find((p) => p.id === 100)).toEqual(product);
      }
    });

    it('updateProduct sobrescribe el precio', async () => {
      const other: Product = { ...product, id: 101, name: 'Te' };
      await adapter.createProduct(other);

      const updated = { ...other, price: 2 };
      const updateResult = await adapter.updateProduct(updated);
      expect(updateResult.ok).toBe(true);

      const getResult = await adapter.getProducts();
      if (getResult.ok) {
        expect(getResult.value.find((p) => p.id === 101)?.price).toBe(2);
      }
    });

    it('deleteProduct elimina el registro', async () => {
      const other: Product = { ...product, id: 102, name: 'Zumo' };
      await adapter.createProduct(other);

      const deleteResult = await adapter.deleteProduct(other);
      expect(deleteResult.ok).toBe(true);

      const getResult = await adapter.getProducts();
      if (getResult.ok) {
        expect(getResult.value.find((p) => p.id === 102)).toBeUndefined();
      }
    });
  });

  describe('orders', () => {
    const order: Order = {
      id: 200,
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

    it('createOrder + getOrders hace round-trip real', async () => {
      const createResult = await adapter.createOrder(order);
      expect(createResult.ok).toBe(true);

      const getResult = await adapter.getOrders();
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.find((o) => o.id === 200)).toEqual(order);
      }
    });

    it('updateOrder sobrescribe el status', async () => {
      const other: Order = { ...order, id: 201 };
      await adapter.createOrder(other);

      const updated: Order = { ...other, status: 'canceled' };
      const updateResult = await adapter.updateOrder(updated);
      expect(updateResult.ok).toBe(true);

      const getResult = await adapter.getOrders();
      if (getResult.ok) {
        expect(getResult.value.find((o) => o.id === 201)?.status).toBe('canceled');
      }
    });

    it('deleteOrder elimina el registro', async () => {
      const other: Order = { ...order, id: 202 };
      await adapter.createOrder(other);

      const deleteResult = await adapter.deleteOrder(other);
      expect(deleteResult.ok).toBe(true);

      const getResult = await adapter.getOrders();
      if (getResult.ok) {
        expect(getResult.value.find((o) => o.id === 202)).toBeUndefined();
      }
    });
  });

  describe('tables', () => {
    const table: Table = { id: 300, name: 'Mesa 1', available: true };

    it('createTable + getTables hace round-trip real', async () => {
      const createResult = await adapter.createTable(table);
      expect(createResult.ok).toBe(true);

      const getResult = await adapter.getTables();
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.find((t) => t.id === 300)).toEqual(table);
      }
    });

    it('updateTable marca la mesa como ocupada', async () => {
      const other: Table = { ...table, id: 301 };
      await adapter.createTable(other);

      const updated: Table = { ...other, available: false };
      const updateResult = await adapter.updateTable(updated);
      expect(updateResult.ok).toBe(true);

      const getResult = await adapter.getTables();
      if (getResult.ok) {
        expect(getResult.value.find((t) => t.id === 301)?.available).toBe(false);
      }
    });

    it('deleteTable elimina el registro', async () => {
      const other: Table = { ...table, id: 302 };
      await adapter.createTable(other);

      const deleteResult = await adapter.deleteTable(other);
      expect(deleteResult.ok).toBe(true);

      const getResult = await adapter.getTables();
      if (getResult.ok) {
        expect(getResult.value.find((t) => t.id === 302)).toBeUndefined();
      }
    });
  });

  describe('users', () => {
    const user: User = { id: 400, name: 'Waxin', profilePicture: '', pin: '1234' };

    it('createUser + getUsers hace round-trip real', async () => {
      const createResult = await adapter.createUser(user);
      expect(createResult.ok).toBe(true);

      const getResult = await adapter.getUsers();
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value.find((u) => u.id === 400)).toEqual(user);
      }
    });

    it('updateUser sobrescribe el pin', async () => {
      const other: User = { ...user, id: 401 };
      await adapter.createUser(other);

      const updated: User = { ...other, pin: '9999' };
      const updateResult = await adapter.updateUser(updated);
      expect(updateResult.ok).toBe(true);

      const getResult = await adapter.getUsers();
      if (getResult.ok) {
        expect(getResult.value.find((u) => u.id === 401)?.pin).toBe('9999');
      }
    });

    it('deleteUser elimina el registro', async () => {
      const other: User = { ...user, id: 402 };
      await adapter.createUser(other);

      const deleteResult = await adapter.deleteUser(other);
      expect(deleteResult.ok).toBe(true);

      const getResult = await adapter.getUsers();
      if (getResult.ok) {
        expect(getResult.value.find((u) => u.id === 402)).toBeUndefined();
      }
    });
  });

  describe('utility', () => {
    // Estos tests corren al final del archivo a propósito: clearAllData borra
    // TODAS las stores, así que deben ejecutarse después de los CRUD de arriba
    // para no dejar el resto de tests sin datos que leer.

    it('clearAllData vacía todas las object stores', async () => {
      const clearResult = await adapter.clearAllData();
      expect(clearResult.ok).toBe(true);

      const getResult = await adapter.getProducts();
      if (getResult.ok) expect(getResult.value).toHaveLength(0);
    });

    it('exportData refleja exactamente lo creado tras el clear', async () => {
      const product: Product = {
        id: 600,
        name: 'Agua',
        price: 1,
        category: 'bebidas',
        brand: '',
        iconType: '',
        selectedIcon: '',
        uploadedImage: null,
      };
      const category: Category = { id: 600, name: 'Aguas', description: '' };
      await adapter.createProduct(product);
      await adapter.createCategory(category);

      const exportResult = await adapter.exportData();
      expect(exportResult.ok).toBe(true);
      if (exportResult.ok) {
        expect(exportResult.value.products).toEqual([product]);
        expect(exportResult.value.categories).toEqual([category]);
        expect(exportResult.value.orders).toEqual([]);
      }
    });

    it('importData limpia y repuebla con el dataset dado', async () => {
      const product: Product = {
        id: 700,
        name: 'Vino',
        price: 5,
        category: 'bebidas',
        brand: '',
        iconType: '',
        selectedIcon: '',
        uploadedImage: null,
      };

      const importResult = await adapter.importData({
        products: [product],
        categories: [],
        orders: [],
      });
      expect(importResult.ok).toBe(true);

      const getResult = await adapter.getProducts();
      if (getResult.ok) {
        expect(getResult.value).toEqual([product]);
      }
    });
  });
});
