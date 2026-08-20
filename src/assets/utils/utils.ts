import type Order from '@/models/Order.ts';

export const renderTicketPreview = (order: Order) => {
  return `
Bar El Haido 🌰 🌳 Ticket #${order.id}
--------------------------------
Fecha: ${order.date}
Mesa: ${order.tableNumber === 0 ? 'Barra' : order.tableNumber}

Pedido:
${order.items.map((item) => `${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€`).join('\n')}

Total: ${order.total.toFixed(2)}€
${
  order.status === 'paid'
    ? `Estado: Pagado
Método de pago: ${order.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
${
  order.paymentMethod === 'efectivo'
    ? `Total pagado: ${order.totalPaid.toFixed(2)}€
Cambio: ${order.change.toFixed(2)}€`
    : ''
}`
    : `Estado: Pendiente de pago`
}
--------------------------------
        `;
};
