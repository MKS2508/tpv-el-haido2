
export interface OrderItem {
    quantity: number;
    id: number;
    name: string;
    price: number;
    category: string;
}
export default interface Order {
    id: number;
    date: string;
    total: number;
    change: number;
    totalPaid: number;
    itemCount: number;
    tableNumber: number;
    paymentMethod: "efectivo" | "tarjeta" | string;
    ticketPath: string;
    status: "paid" | "unpaid" | "canceled" | "inProgress" | string;
    items: OrderItem[];
}