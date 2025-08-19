import axios from "axios";
import Order from "@/models/Order.ts";

interface IOrderService {
    getOrders(): Promise<Order[]>;
    createOrder(order: Order): Promise<void>;
    deleteOrder(order: Order): Promise<void>;
    updateOrder(order: Order): Promise<void>;
}


export default class OrderService implements IOrderService {
    public ENDPOINT: string = 'http://localhost:3000/api/orders';
    async getOrders(): Promise<Order[]> {
        try {
            const response = await axios.get(this.ENDPOINT);
            const orders = response.data;
            return orders;
        } catch (error) {
            console.error("Failed to fetch orders:", error);
            return [];
        }
    }

    async createOrder(order: Order): Promise<void> {
        try {
            await axios.post(this.ENDPOINT, order);
        } catch (error) {
            console.error("Failed to create order:", error);
        }
    }

    async deleteOrder(order: Order): Promise<void> {
        try {
            await axios.delete(`${this.ENDPOINT}/${order.id}`);
        } catch (error) {
            console.error("Failed to delete order:", error);
        }
    }

    async updateOrder(order: Order): Promise<void> {
        console.log("Updating order:", order);
        console.log("ID:", order.id);
        try {
            await axios.put(`${this.ENDPOINT}/${order.id}`, order);
        } catch (error) {
            console.error("Failed to update order:", error);
        }
    }

}
