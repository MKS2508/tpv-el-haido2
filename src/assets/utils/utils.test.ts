import { describe, expect, it } from 'vitest';
import { renderTicketPreview } from '@/assets/utils/utils';
import type Order from '@/models/Order';

describe('assets/utils - renderTicketPreview', () => {
  const baseOrder: Order = {
    id: 1,
    date: '2026-08-20',
    total: 10,
    change: 0,
    totalPaid: 10,
    itemCount: 1,
    tableNumber: 3,
    paymentMethod: 'efectivo',
    ticketPath: '',
    status: 'paid',
    items: [{ id: 1, name: 'Cafe', price: 10, quantity: 1, category: 'bebidas' }],
  };

  it('incluye número de ticket, mesa e items formateados', () => {
    const preview = renderTicketPreview(baseOrder);
    expect(preview).toContain('Ticket #1');
    expect(preview).toContain('Mesa: 3');
    expect(preview).toContain('Cafe x1 - 10.00€');
    expect(preview).toContain('Total: 10.00€');
  });

  it('muestra "Barra" cuando tableNumber es 0', () => {
    const preview = renderTicketPreview({ ...baseOrder, tableNumber: 0 });
    expect(preview).toContain('Mesa: Barra');
  });

  it('pedido pagado en efectivo muestra total pagado y cambio', () => {
    const preview = renderTicketPreview({ ...baseOrder, totalPaid: 15, change: 5 });
    expect(preview).toContain('Estado: Pagado');
    expect(preview).toContain('Método de pago: Efectivo');
    expect(preview).toContain('Total pagado: 15.00€');
    expect(preview).toContain('Cambio: 5.00€');
  });

  it('pedido pagado con tarjeta no muestra total pagado ni cambio', () => {
    const preview = renderTicketPreview({ ...baseOrder, paymentMethod: 'tarjeta' });
    expect(preview).toContain('Método de pago: Tarjeta');
    expect(preview).not.toContain('Total pagado');
  });

  it('pedido no pagado muestra estado pendiente', () => {
    const preview = renderTicketPreview({ ...baseOrder, status: 'inProgress' });
    expect(preview).toContain('Estado: Pendiente de pago');
  });
});
