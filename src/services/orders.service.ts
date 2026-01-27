import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type Order from '@/models/Order.ts';

const DEFAULT_TIMEOUT = 10000;

interface IOrderService {
  getOrders(): Promise<Order[]>;
  createOrder(order: Order): Promise<void>;
  deleteOrder(order: Order): Promise<void>;
  updateOrder(order: Order): Promise<void>;
}

export default class OrderService implements IOrderService {
  public ENDPOINT: string = 'http://localhost:3000/api/orders';
  private activeController: AbortController | null = null;

  private getFetchFn() {
    return typeof window !== 'undefined' && '__TAURI_IPC__' in window ? tauriFetch : fetch;
  }

  private createController(timeout = DEFAULT_TIMEOUT): AbortController {
    this.cancelPendingRequest();
    const controller = new AbortController();
    this.activeController = controller;

    if (timeout > 0) {
      setTimeout(() => {
        if (this.activeController === controller) {
          controller.abort(new Error(`Request timeout after ${timeout}ms`));
          this.activeController = null;
        }
      }, timeout);
    }

    return controller;
  }

  cancelPendingRequest(): void {
    if (this.activeController) {
      this.activeController.abort(new Error('Request cancelled'));
      this.activeController = null;
    }
  }

  async getOrders(): Promise<Order[]> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(this.ENDPOINT, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as Order[];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Orders fetch aborted');
      } else {
        console.error('Failed to fetch orders:', error);
      }
      return [];
    } finally {
      this.activeController = null;
    }
  }

  async createOrder(order: Order): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      this.activeController = null;
    }
  }

  async deleteOrder(order: Order): Promise<void> {
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(`${this.ENDPOINT}/${order.id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete order:', error);
    } finally {
      this.activeController = null;
    }
  }

  async updateOrder(order: Order): Promise<void> {
    console.log('Updating order:', order);
    console.log('ID:', order.id);
    const controller = this.createController();
    try {
      const response = await this.getFetchFn()(`${this.ENDPOINT}/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    } finally {
      this.activeController = null;
    }
  }
}
