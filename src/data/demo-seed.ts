/**
 * Demo Seed Data
 *
 * Datos de demostración para capturas del Kit Digital.
 * Incluye clientes, pedidos con facturas AEAT, usuarios, etc.
 */

import type Customer from '@/models/Customer';
import type Order from '@/models/Order';
import type User from '@/models/User';

// ==================== Usuarios Demo ====================

export const demoUsers: User[] = [
  {
    id: 1,
    name: 'María García',
    profilePicture: '/avatars/maria.svg',
    pin: '1234',
    pinnedProductIds: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 2,
    name: 'Carlos Rodríguez',
    profilePicture: '/avatars/carlos.svg',
    pin: '5678',
    pinnedProductIds: [1, 2, 3],
  },
  {
    id: 3,
    name: 'Ana Martínez',
    profilePicture: '/avatars/ana.svg',
    pin: '9012',
    pinnedProductIds: [4, 5, 6],
  },
  {
    id: 4,
    name: 'Pedro López',
    profilePicture: '/avatars/pedro.svg',
    pin: '3456',
    pinnedProductIds: [1, 3, 5],
  },
];

// ==================== Clientes Demo ====================

export const demoCustomers: Customer[] = [
  {
    id: 1,
    cifNif: 'B12345678',
    nombreFiscal: 'Restaurante El Buen Sabor S.L.',
    nombreComercial: 'El Buen Sabor',
    direccion: 'Calle Mayor, 15',
    codigoPostal: '28001',
    poblacion: 'Madrid',
    telefono: '912345678',
    email: 'contacto@elbuensabor.es',
    activo: true,
    createdAt: '2024-01-15T10:30:00.000Z',
  },
  {
    id: 2,
    cifNif: 'A87654321',
    nombreFiscal: 'Distribuciones Alimentarias González S.A.',
    nombreComercial: 'Distri González',
    direccion: 'Polígono Industrial Norte, Nave 42',
    codigoPostal: '28850',
    poblacion: 'Torrejón de Ardoz',
    telefono: '916789012',
    email: 'pedidos@distrigonzalez.com',
    activo: true,
    createdAt: '2024-02-20T14:45:00.000Z',
  },
  {
    id: 3,
    cifNif: '12345678A',
    nombreFiscal: 'Juan Pérez Sánchez',
    nombreComercial: '',
    direccion: 'Avenida de la Constitución, 78, 3ºB',
    codigoPostal: '28040',
    poblacion: 'Madrid',
    telefono: '658123456',
    email: 'juanperez@email.com',
    activo: true,
    createdAt: '2024-03-10T09:15:00.000Z',
  },
  {
    id: 4,
    cifNif: 'B98765432',
    nombreFiscal: 'Bar La Esquina S.L.',
    nombreComercial: 'Bar La Esquina',
    direccion: 'Plaza del Sol, 3',
    codigoPostal: '28013',
    poblacion: 'Madrid',
    telefono: '913456789',
    email: 'info@barlaesquina.es',
    activo: true,
    createdAt: '2024-03-25T11:00:00.000Z',
  },
  {
    id: 5,
    cifNif: 'G11223344',
    nombreFiscal: 'Asociación Gastronómica Madrileña',
    nombreComercial: 'AGM',
    direccion: 'Calle Serrano, 120',
    codigoPostal: '28006',
    poblacion: 'Madrid',
    telefono: '914567890',
    email: 'secretaria@agm.org',
    activo: true,
    createdAt: '2024-04-01T16:30:00.000Z',
  },
  {
    id: 6,
    cifNif: '87654321B',
    nombreFiscal: 'Laura Fernández Ruiz',
    nombreComercial: '',
    direccion: 'Calle Alcalá, 234, 5ºA',
    codigoPostal: '28027',
    poblacion: 'Madrid',
    telefono: '678901234',
    email: 'laura.fernandez@gmail.com',
    activo: false,
    createdAt: '2024-04-15T13:20:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
  },
  {
    id: 7,
    cifNif: 'B55667788',
    nombreFiscal: 'Catering Premium Madrid S.L.',
    nombreComercial: 'Catering Premium',
    direccion: 'Calle Velázquez, 89',
    codigoPostal: '28001',
    poblacion: 'Madrid',
    telefono: '915678901',
    email: 'eventos@cateringpremium.es',
    activo: true,
    createdAt: '2024-05-10T08:45:00.000Z',
  },
  {
    id: 8,
    cifNif: 'A33445566',
    nombreFiscal: 'Hotel Metrópolis S.A.',
    nombreComercial: 'Hotel Metrópolis',
    direccion: 'Gran Vía, 45',
    codigoPostal: '28013',
    poblacion: 'Madrid',
    telefono: '917890123',
    email: 'reservas@hotelmetropolis.com',
    activo: true,
    createdAt: '2024-05-20T15:00:00.000Z',
  },
];

// ==================== Pedidos Demo con Facturas AEAT ====================

const generateInvoiceNumber = (index: number): string => {
  const year = new Date().getFullYear();
  return `TPV-${year}-${String(index).padStart(6, '0')}`;
};

const generateCSV = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let csv = '';
  for (let i = 0; i < 16; i++) {
    csv += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return csv;
};

const getDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const demoOrders: Order[] = [
  // Facturas ACEPTADAS
  {
    id: 1001,
    date: getDateDaysAgo(0),
    total: 45.5,
    change: 4.5,
    totalPaid: 50.0,
    itemCount: 5,
    tableNumber: 3,
    paymentMethod: 'efectivo',
    ticketPath: '/tickets/1001.pdf',
    status: 'paid',
    items: [
      { id: 1, name: 'Café con leche', price: 1.8, quantity: 2, category: 'Cafetería' },
      { id: 2, name: 'Tostada con tomate', price: 2.5, quantity: 2, category: 'Desayunos' },
      { id: 3, name: 'Zumo de naranja', price: 3.0, quantity: 1, category: 'Bebidas' },
      { id: 4, name: 'Menú del día', price: 14.9, quantity: 2, category: 'Menús' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(1),
      numSerieFactura: generateInvoiceNumber(1),
      csv: generateCSV(),
      invoiceSentAt: getDateDaysAgo(0),
      invoiceStatus: 'accepted',
      taxBreakdown: [{ rate: 10, baseAmount: 41.36, taxAmount: 4.14 }],
    },
  },
  {
    id: 1002,
    date: getDateDaysAgo(1),
    total: 78.2,
    change: 0,
    totalPaid: 78.2,
    itemCount: 8,
    tableNumber: 7,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1002.pdf',
    status: 'paid',
    items: [
      { id: 5, name: 'Cerveza Mahou', price: 2.5, quantity: 4, category: 'Bebidas' },
      { id: 6, name: 'Tabla de ibéricos', price: 18.9, quantity: 1, category: 'Raciones' },
      { id: 7, name: 'Croquetas caseras', price: 8.5, quantity: 2, category: 'Raciones' },
      { id: 8, name: 'Tortilla española', price: 12.0, quantity: 1, category: 'Raciones' },
      { id: 9, name: 'Patatas bravas', price: 6.5, quantity: 2, category: 'Raciones' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(2),
      numSerieFactura: generateInvoiceNumber(2),
      csv: generateCSV(),
      invoiceSentAt: getDateDaysAgo(1),
      invoiceStatus: 'accepted',
      taxBreakdown: [{ rate: 10, baseAmount: 71.09, taxAmount: 7.11 }],
    },
  },
  {
    id: 1003,
    date: getDateDaysAgo(2),
    total: 156.8,
    change: 0,
    totalPaid: 156.8,
    itemCount: 12,
    tableNumber: 1,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1003.pdf',
    status: 'paid',
    items: [
      { id: 10, name: 'Menú degustación', price: 45.0, quantity: 2, category: 'Menús' },
      { id: 11, name: 'Vino Rioja Reserva', price: 28.0, quantity: 1, category: 'Vinos' },
      { id: 12, name: 'Postre del día', price: 6.5, quantity: 2, category: 'Postres' },
      { id: 13, name: 'Café', price: 1.5, quantity: 2, category: 'Cafetería' },
      { id: 14, name: 'Copa de cava', price: 4.9, quantity: 4, category: 'Bebidas' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(3),
      numSerieFactura: generateInvoiceNumber(3),
      csv: generateCSV(),
      invoiceSentAt: getDateDaysAgo(2),
      invoiceStatus: 'accepted',
      taxBreakdown: [{ rate: 10, baseAmount: 142.55, taxAmount: 14.25 }],
    },
  },
  {
    id: 1004,
    date: getDateDaysAgo(3),
    total: 32.4,
    change: 7.6,
    totalPaid: 40.0,
    itemCount: 4,
    tableNumber: 5,
    paymentMethod: 'efectivo',
    ticketPath: '/tickets/1004.pdf',
    status: 'paid',
    items: [
      { id: 15, name: 'Bocadillo de calamares', price: 8.5, quantity: 2, category: 'Bocadillos' },
      { id: 16, name: 'Refresco', price: 2.2, quantity: 2, category: 'Bebidas' },
      { id: 17, name: 'Café cortado', price: 1.5, quantity: 2, category: 'Cafetería' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(4),
      numSerieFactura: generateInvoiceNumber(4),
      csv: generateCSV(),
      invoiceSentAt: getDateDaysAgo(3),
      invoiceStatus: 'accepted',
      taxBreakdown: [{ rate: 10, baseAmount: 29.45, taxAmount: 2.95 }],
    },
  },

  // Facturas PENDIENTES
  {
    id: 1005,
    date: getDateDaysAgo(0),
    total: 23.7,
    change: 0,
    totalPaid: 23.7,
    itemCount: 3,
    tableNumber: 2,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1005.pdf',
    status: 'paid',
    items: [
      { id: 18, name: 'Ensalada César', price: 9.9, quantity: 1, category: 'Ensaladas' },
      { id: 19, name: 'Agua mineral', price: 1.8, quantity: 2, category: 'Bebidas' },
      { id: 20, name: 'Tarta de queso', price: 5.5, quantity: 1, category: 'Postres' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(5),
      numSerieFactura: generateInvoiceNumber(5),
      invoiceSentAt: getDateDaysAgo(0),
      invoiceStatus: 'pending',
      taxBreakdown: [{ rate: 10, baseAmount: 21.55, taxAmount: 2.15 }],
    },
  },
  {
    id: 1006,
    date: getDateDaysAgo(0),
    total: 67.3,
    change: 2.7,
    totalPaid: 70.0,
    itemCount: 7,
    tableNumber: 8,
    paymentMethod: 'efectivo',
    ticketPath: '/tickets/1006.pdf',
    status: 'paid',
    items: [
      { id: 21, name: 'Paella valenciana', price: 14.9, quantity: 2, category: 'Arroces' },
      { id: 22, name: 'Sangría jarra', price: 12.0, quantity: 1, category: 'Bebidas' },
      { id: 23, name: 'Pan con alioli', price: 3.5, quantity: 2, category: 'Entrantes' },
      { id: 24, name: 'Flan casero', price: 4.5, quantity: 2, category: 'Postres' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(6),
      numSerieFactura: generateInvoiceNumber(6),
      invoiceSentAt: getDateDaysAgo(0),
      invoiceStatus: 'pending',
      taxBreakdown: [{ rate: 10, baseAmount: 61.18, taxAmount: 6.12 }],
    },
  },

  // Factura RECHAZADA
  {
    id: 1007,
    date: getDateDaysAgo(5),
    total: 89.9,
    change: 0,
    totalPaid: 89.9,
    itemCount: 6,
    tableNumber: 4,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1007.pdf',
    status: 'paid',
    items: [
      { id: 25, name: 'Solomillo a la plancha', price: 18.9, quantity: 2, category: 'Carnes' },
      { id: 26, name: 'Vino tinto copa', price: 4.5, quantity: 4, category: 'Vinos' },
      { id: 27, name: 'Ensalada mixta', price: 6.9, quantity: 2, category: 'Ensaladas' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(7),
      numSerieFactura: generateInvoiceNumber(7),
      invoiceSentAt: getDateDaysAgo(5),
      invoiceStatus: 'rejected',
      invoiceError: 'Error en el NIF del emisor: formato no válido',
      aeatResponseCode: '4102',
      taxBreakdown: [{ rate: 10, baseAmount: 81.73, taxAmount: 8.17 }],
    },
  },

  // Pedidos SIN FACTURAR
  {
    id: 1008,
    date: getDateDaysAgo(1),
    total: 15.8,
    change: 4.2,
    totalPaid: 20.0,
    itemCount: 2,
    tableNumber: 0, // Barra
    paymentMethod: 'efectivo',
    ticketPath: '/tickets/1008.pdf',
    status: 'paid',
    items: [
      { id: 28, name: 'Caña de cerveza', price: 1.8, quantity: 4, category: 'Bebidas' },
      { id: 29, name: 'Pincho de tortilla', price: 2.5, quantity: 2, category: 'Pinchos' },
    ],
    // Sin información AEAT = no facturado
  },
  {
    id: 1009,
    date: getDateDaysAgo(2),
    total: 28.5,
    change: 1.5,
    totalPaid: 30.0,
    itemCount: 3,
    tableNumber: 6,
    paymentMethod: 'efectivo',
    ticketPath: '/tickets/1009.pdf',
    status: 'paid',
    items: [
      { id: 30, name: 'Hamburguesa completa', price: 10.9, quantity: 2, category: 'Hamburguesas' },
      { id: 31, name: 'Patatas fritas', price: 3.5, quantity: 2, category: 'Guarniciones' },
    ],
    // Sin información AEAT = no facturado
  },
  {
    id: 1010,
    date: getDateDaysAgo(4),
    total: 52.0,
    change: 0,
    totalPaid: 52.0,
    itemCount: 5,
    tableNumber: 9,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1010.pdf',
    status: 'paid',
    items: [
      { id: 32, name: 'Pizza margarita', price: 11.5, quantity: 2, category: 'Pizzas' },
      { id: 33, name: 'Coca-Cola', price: 2.5, quantity: 2, category: 'Bebidas' },
      { id: 34, name: 'Tiramisú', price: 5.9, quantity: 2, category: 'Postres' },
      { id: 35, name: 'Café americano', price: 2.0, quantity: 2, category: 'Cafetería' },
    ],
    // Sin información AEAT = no facturado
  },

  // Más facturas aceptadas para llenar estadísticas
  {
    id: 1011,
    date: getDateDaysAgo(6),
    total: 124.5,
    change: 0,
    totalPaid: 124.5,
    itemCount: 10,
    tableNumber: 1,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1011.pdf',
    status: 'paid',
    items: [
      { id: 36, name: 'Entrecot', price: 22.9, quantity: 2, category: 'Carnes' },
      { id: 37, name: 'Vino Ribera del Duero', price: 32.0, quantity: 1, category: 'Vinos' },
      { id: 38, name: 'Gazpacho', price: 5.5, quantity: 2, category: 'Entrantes' },
      { id: 39, name: 'Crema catalana', price: 5.9, quantity: 2, category: 'Postres' },
      { id: 40, name: 'Chupito', price: 3.0, quantity: 4, category: 'Bebidas' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(11),
      numSerieFactura: generateInvoiceNumber(11),
      csv: generateCSV(),
      invoiceSentAt: getDateDaysAgo(6),
      invoiceStatus: 'accepted',
      taxBreakdown: [{ rate: 10, baseAmount: 113.18, taxAmount: 11.32 }],
    },
  },
  {
    id: 1012,
    date: getDateDaysAgo(7),
    total: 95.6,
    change: 0,
    totalPaid: 95.6,
    itemCount: 8,
    tableNumber: 3,
    paymentMethod: 'tarjeta',
    ticketPath: '/tickets/1012.pdf',
    status: 'paid',
    items: [
      { id: 41, name: 'Pulpo a la gallega', price: 16.9, quantity: 2, category: 'Mariscos' },
      { id: 42, name: 'Albariño', price: 22.0, quantity: 1, category: 'Vinos' },
      { id: 43, name: 'Pimientos de padrón', price: 7.5, quantity: 2, category: 'Raciones' },
      { id: 44, name: 'Filloas', price: 5.9, quantity: 2, category: 'Postres' },
    ],
    aeat: {
      invoiceSent: true,
      invoiceNumber: generateInvoiceNumber(12),
      numSerieFactura: generateInvoiceNumber(12),
      csv: generateCSV(),
      invoiceSentAt: getDateDaysAgo(7),
      invoiceStatus: 'accepted',
      taxBreakdown: [{ rate: 10, baseAmount: 86.91, taxAmount: 8.69 }],
    },
  },
];

// ==================== Función para cargar datos demo ====================

export interface DemoSeedResult {
  customers: Customer[];
  orders: Order[];
  users: User[];
}

export function getDemoSeedData(): DemoSeedResult {
  return {
    customers: demoCustomers,
    orders: demoOrders,
    users: demoUsers,
  };
}

// ==================== Estadísticas de los datos demo ====================

export function getDemoStats() {
  const orders = demoOrders;
  const invoicedOrders = orders.filter((o) => o.aeat?.invoiceSent);
  const acceptedOrders = orders.filter((o) => o.aeat?.invoiceStatus === 'accepted');
  const pendingOrders = orders.filter((o) => o.aeat?.invoiceStatus === 'pending');
  const rejectedOrders = orders.filter((o) => o.aeat?.invoiceStatus === 'rejected');
  const notInvoicedOrders = orders.filter((o) => !o.aeat?.invoiceSent);

  return {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    invoiced: {
      total: invoicedOrders.length,
      accepted: acceptedOrders.length,
      pending: pendingOrders.length,
      rejected: rejectedOrders.length,
    },
    notInvoiced: notInvoicedOrders.length,
    customers: demoCustomers.length,
    activeCustomers: demoCustomers.filter((c) => c.activo).length,
  };
}
