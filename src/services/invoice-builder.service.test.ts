import { describe, expect, it } from 'vitest';
import type { AEATBusinessData } from '@/models/AEAT';
import type Order from '@/models/Order';
import {
  calculateMultipleTaxBreakdown,
  calculateTaxBreakdown,
  validateBusinessData,
  validateOrder,
} from '@/services/invoice-builder.service';

describe('invoice-builder.service - calculateTaxBreakdown', () => {
  it('descompone un total con IVA 21% en base imponible + cuota', () => {
    const result = calculateTaxBreakdown(121, 21);
    expect(result).toEqual({ rate: 21, baseAmount: 100, taxAmount: 21 });
  });

  it('usa 21% como tipo por defecto si no se pasa taxRate', () => {
    expect(calculateTaxBreakdown(121).rate).toBe(21);
  });

  it('redondea a 2 decimales sin arrastrar error de floating point', () => {
    const result = calculateTaxBreakdown(10, 21);
    expect(result.baseAmount).toBe(8.26);
    expect(result.taxAmount).toBe(1.74);
  });
});

describe('invoice-builder.service - calculateMultipleTaxBreakdown', () => {
  it('agrupa y suma breakdowns del mismo tipo impositivo', () => {
    const result = calculateMultipleTaxBreakdown([
      { total: 121, taxRate: 21 },
      { total: 242, taxRate: 21 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ rate: 21, baseAmount: 300, taxAmount: 63 });
  });

  it('mantiene tipos impositivos distintos separados', () => {
    const result = calculateMultipleTaxBreakdown([
      { total: 121, taxRate: 21 },
      { total: 110, taxRate: 10 },
    ]);
    expect(result).toHaveLength(2);
  });
});

describe('invoice-builder.service - validateOrder', () => {
  const baseOrder: Order = {
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

  it('valida un pedido pagado con items y total > 0', () => {
    const result = validateOrder(baseOrder);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza un pedido no pagado', () => {
    const result = validateOrder({ ...baseOrder, status: 'inProgress' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('El pedido debe estar pagado para emitir factura');
  });

  it('rechaza un pedido sin items', () => {
    const result = validateOrder({ ...baseOrder, items: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('El pedido debe tener al menos un producto');
  });
});

describe('invoice-builder.service - validateBusinessData', () => {
  const baseBusinessData: AEATBusinessData = {
    nif: 'B12345678',
    nombreRazon: 'Bar El Haido SL',
    serieFactura: 'TPV-',
    tipoFactura: 'F1',
    descripcionOperacion: 'Venta de bebidas y comida',
  };

  it('valida datos fiscales completos', () => {
    const result = validateBusinessData(baseBusinessData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza un NIF vacío', () => {
    const result = validateBusinessData({ ...baseBusinessData, nif: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('El NIF/CIF es obligatorio');
  });

  it('rechaza un NIF con formato inválido', () => {
    const result = validateBusinessData({ ...baseBusinessData, nif: '123' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('El NIF/CIF debe tener 9 caracteres alfanuméricos');
  });

  it('rechaza una razón social vacía', () => {
    const result = validateBusinessData({ ...baseBusinessData, nombreRazon: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('La razón social es obligatoria');
  });

  it('rechaza una serie de factura vacía', () => {
    const result = validateBusinessData({ ...baseBusinessData, serieFactura: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('El prefijo de serie de factura es obligatorio');
  });
});
