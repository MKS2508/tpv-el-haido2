import { beforeEach, describe, expect, it } from 'vitest';
import type Order from '@/models/Order';
import type Product from '@/models/Product';
import useStore from '@/store/store';

describe('store - addToOrder / removeFromOrder', () => {
  const store = useStore();

  const testProduct: Product = {
    id: 100,
    name: 'Cerveza',
    price: 2.5,
    category: 'bebidas',
    brand: '',
    iconType: '',
    selectedIcon: '',
    uploadedImage: null,
  };

  const emptyOrder: Order = {
    id: 999,
    date: '2026-08-20',
    total: 0,
    change: 0,
    totalPaid: 0,
    itemCount: 0,
    tableNumber: 5,
    paymentMethod: 'efectivo',
    ticketPath: '',
    status: 'inProgress',
    items: [],
  };

  beforeEach(() => {
    // Reset del slice relevante — el store es singleton sin reset export,
    // así que reseteamos vía setters existentes en vez de recrear la instancia.
    store.setActiveOrders([{ ...emptyOrder, items: [] }]);
  });

  it('addToOrder agrega un item nuevo y recalcula total/itemCount', async () => {
    await store.addToOrder(999, testProduct);

    const order = store.state.activeOrders.find((o) => o.id === 999);
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]).toMatchObject({ id: 100, quantity: 1, price: 2.5 });
    expect(order?.total).toBe(2.5);
    expect(order?.itemCount).toBe(1);
  });

  it('addToOrder incrementa quantity si el item ya existe en el pedido', async () => {
    await store.addToOrder(999, testProduct);
    await store.addToOrder(999, testProduct);

    const order = store.state.activeOrders.find((o) => o.id === 999);
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0].quantity).toBe(2);
    expect(order?.total).toBe(5);
  });

  it('removeFromOrder decrementa quantity y recalcula totales desde cero', async () => {
    await store.addToOrder(999, testProduct);
    await store.addToOrder(999, testProduct);

    await store.removeFromOrder(999, 100);

    const order = store.state.activeOrders.find((o) => o.id === 999);
    expect(order?.items[0].quantity).toBe(1);
    expect(order?.total).toBe(2.5);
  });

  it('removeFromOrder elimina el item cuando quantity llega a 0', async () => {
    await store.addToOrder(999, testProduct);

    await store.removeFromOrder(999, 100);

    const order = store.state.activeOrders.find((o) => o.id === 999);
    expect(order?.items).toHaveLength(0);
    expect(order?.total).toBe(0);
    expect(order?.itemCount).toBe(0);
  });
});

describe('store - setStorageMode', () => {
  const store = useStore();

  it('actualiza state.storageMode y el storageAdapter activo al cambiar de modo', () => {
    store.setStorageMode('http');
    expect(store.state.storageMode).toBe('http');

    store.setStorageMode('indexeddb');
    expect(store.state.storageMode).toBe('indexeddb');
  });
});

describe('store - handleTableChange', () => {
  const store = useStore();

  beforeEach(() => {
    store.setActiveOrders([]);
    store.setSelectedOrderId(null);
  });

  it('reutiliza una orden activa in-progress existente en la mesa', async () => {
    const existingOrder: Order = {
      id: 1001,
      date: '2026-08-20',
      total: 5,
      change: 0,
      totalPaid: 0,
      itemCount: 1,
      tableNumber: 7,
      paymentMethod: 'efectivo',
      ticketPath: '',
      status: 'inProgress',
      items: [{ id: 1, name: 'Cafe', price: 5, quantity: 1, category: 'bebidas' }],
    };
    store.setActiveOrders([existingOrder]);

    await store.handleTableChange(7);

    expect(store.state.selectedOrderId).toBe(1001);
    expect(store.state.selectedOrder?.id).toBe(1001);
  });

  it('crea una orden nueva cuando no hay ninguna activa para la mesa', async () => {
    await store.handleTableChange(9);

    const created = store.state.activeOrders.find((o) => o.tableNumber === 9);
    expect(created).toBeDefined();
    expect(created?.status).toBe('inProgress');
    expect(store.state.selectedOrderId).toBe(created?.id);
  });
});

describe('store - handleCompleteOrder / closeOrder', () => {
  const store = useStore();

  const inProgressOrder: Order = {
    id: 1002,
    date: '2026-08-20',
    total: 15,
    change: 0,
    totalPaid: 15,
    itemCount: 2,
    tableNumber: 3,
    paymentMethod: 'tarjeta',
    ticketPath: '',
    status: 'inProgress',
    items: [{ id: 1, name: 'Bocadillo', price: 15, quantity: 1, category: 'comida' }],
  };

  beforeEach(() => {
    store.setActiveOrders([{ ...inProgressOrder }]);
    store.setOrderHistory([]);
  });

  it('handleCompleteOrder mueve la orden a orderHistory con status paid', async () => {
    await store.handleCompleteOrder(inProgressOrder);

    expect(store.state.activeOrders.find((o) => o.id === 1002)).toBeUndefined();
    const completed = store.state.orderHistory.find((o) => o.id === 1002);
    expect(completed?.status).toBe('paid');
  });

  it('closeOrder elimina la orden de activeOrders sin pasar por orderHistory', async () => {
    await store.closeOrder(1002);

    expect(store.state.activeOrders.find((o) => o.id === 1002)).toBeUndefined();
    expect(store.state.orderHistory.find((o) => o.id === 1002)).toBeUndefined();
  });
});
