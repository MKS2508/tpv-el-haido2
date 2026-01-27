import { tryCatchAsync, unwrapOr, isErr, type Result, type ResultError } from "@mks2508/no-throw";
import { getClient, ResponseType } from '@tauri-apps/api/http';
import Order from "@/models/Order.ts";
import { OrderErrorCode } from "@/lib/error-codes";

type OrderResult<T> = Result<T, ResultError<typeof OrderErrorCode[keyof typeof OrderErrorCode]>>

interface IOrderService {
    getOrders(): Promise<OrderResult<Order[]>>;
    createOrder(order: Order): Promise<OrderResult<void>>;
    deleteOrder(order: Order): Promise<OrderResult<void>>;
    updateOrder(order: Order): Promise<OrderResult<void>>;
}

export default class OrderService implements IOrderService {
    public ENDPOINT: string = 'http://localhost:3000/api/orders';

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        data?: unknown
    ): Promise<T> {
        // Check if we're running in Tauri environment
        if (typeof window !== 'undefined' && '__TAURI_IPC__' in window) {
            const client = await getClient();

            switch (method) {
                case 'GET': {
                    const response = await client.get(endpoint, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
                case 'POST': {
                    const response = await client.post(endpoint, data, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
                case 'PUT': {
                    const response = await client.put(endpoint, data, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
                case 'DELETE': {
                    const response = await client.delete(endpoint, {
                        timeout: 30,
                        responseType: ResponseType.JSON
                    });
                    return response.data as T;
                }
            }
        } else {
            // Use native fetch for development/browser environment
            const options: RequestInit = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(endpoint, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            if (!text) {
                return undefined as T;
            }

            return JSON.parse(text) as T;
        }
    }

    async getOrders(): Promise<OrderResult<Order[]>> {
        return tryCatchAsync(
            async () => this.makeRequest<Order[]>(this.ENDPOINT),
            OrderErrorCode.LoadFailed
        );
    }

    async createOrder(order: Order): Promise<OrderResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(this.ENDPOINT, 'POST', order) },
            OrderErrorCode.CreateFailed
        );
    }

    async deleteOrder(order: Order): Promise<OrderResult<void>> {
        return tryCatchAsync(
            async () => { await this.makeRequest(`${this.ENDPOINT}/${order.id}`, 'DELETE') },
            OrderErrorCode.DeleteFailed
        );
    }

    async updateOrder(order: Order): Promise<OrderResult<void>> {
        console.log("Updating order:", order);
        console.log("ID:", order.id);
        return tryCatchAsync(
            async () => { await this.makeRequest(`${this.ENDPOINT}/${order.id}`, 'PUT', order) },
            OrderErrorCode.UpdateFailed
        );
    }
}
