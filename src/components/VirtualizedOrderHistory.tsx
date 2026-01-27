import React, { CSSProperties } from "react";
import { List } from 'react-window';
import Order from "@/models/Order.ts";
import { Button } from "@/components/ui/button";
import {
    CheckCircle,
    CreditCard,
    HandCoins,
    Loader2,
    XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResponsive } from "@/hooks/useResponsive";

interface VirtualizedOrderHistoryProps {
    orders: Order[];
    onOrderSelect: (order: Order) => void;
    height?: number;
}

interface RowProps {
    orders: Order[];
    onOrderSelect: (order: Order) => void;
    isMobile: boolean;
}

// Row component for react-window v2
const OrderRow = ({
    index,
    style,
    orders,
    onOrderSelect,
    isMobile
}: {
    index: number;
    style: CSSProperties;
    ariaAttributes: {
        "aria-posinset": number;
        "aria-setsize": number;
        role: "listitem";
    };
} & RowProps) => {
    const order = orders[index];

    if (!order) return null;

    const getStatusIcon = () => {
        switch (order.status) {
            case 'paid':
                if (order.paymentMethod === 'efectivo') {
                    return <div className="flex items-center gap-1"><HandCoins className="w-4 h-4 text-warning" /><CheckCircle className="w-4 h-4 text-success" /></div>;
                }
                return <div className="flex items-center gap-1"><CreditCard className="w-4 h-4 text-info" /><CheckCircle className="w-4 h-4 text-success" /></div>;
            case 'unpaid':
                return <XCircle className="w-4 h-4 text-destructive" />;
            case 'canceled':
                return <XCircle className="w-4 h-4 text-muted-foreground" />;
            case 'inProgress':
                return <Loader2 className="w-4 h-4 animate-spin text-info" />;
            default:
                return null;
        }
    };

    const getStatusText = () => {
        switch (order.status) {
            case 'paid':
                return order.paymentMethod === 'efectivo' ? 'Pagado - Efectivo' : 'Pagado - Tarjeta';
            case 'unpaid':
                return 'No pagado';
            case 'canceled':
                return 'Cancelado';
            case 'inProgress':
                return 'En progreso';
            default:
                return order.status;
        }
    };

    if (isMobile) {
        return (
            <div style={style} className="px-3">
                <div className="pb-3">
                    <Card
                        className="order-card cursor-pointer hover:shadow-md"
                        onClick={() => onOrderSelect(order)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold">
                                    Pedido #{order.id}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {getStatusIcon()}
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{new Date(order.date).toLocaleDateString()}</span>
                                <span className="font-medium text-primary">
                                    {order.tableNumber === 0 ? 'Barra' : `Mesa ${order.tableNumber}`}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total:</span>
                                    <span className="font-bold text-lg text-success">{order.total.toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Artículos:</span>
                                    <span className="text-sm font-medium">{order.itemCount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Estado:</span>
                                    <span className="text-sm font-medium">{getStatusText()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div style={style} className="w-full">
            <table className="w-full border-collapse">
                <tbody>
                    <tr
                        className="order-row hover:bg-muted/50 cursor-pointer"
                        onClick={() => onOrderSelect(order)}
                    >
                        <td className="border border-border px-4 py-3">{order.date}</td>
                        <td className="border border-border px-4 py-3">{order.total.toFixed(2)}€</td>
                        <td className="border border-border px-4 py-3">{order.itemCount}</td>
                        <td className="border border-border px-4 py-3">
                            {order.tableNumber === 0 ? 'Barra' : order.tableNumber}
                        </td>
                        <td className="border border-border px-4 py-3">
                            <div className="flex flex-col items-center">
                                {order.status === 'paid' && order.paymentMethod === 'efectivo' && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <HandCoins className="text-warning"/>
                                            <CheckCircle className="text-success"/>
                                        </div>
                                        <span className="text-xs">Pagado con Efectivo</span>
                                    </>
                                )}
                                {order.status === 'paid' && order.paymentMethod === 'tarjeta' && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="text-info"/>
                                            <CheckCircle className="text-success"/>
                                        </div>
                                        <span className="text-xs">Pagado con Tarjeta</span>
                                    </>
                                )}
                                {order.status === 'unpaid' && (
                                    <>
                                        <XCircle className="text-destructive"/>
                                        <span className="text-xs">No pagado</span>
                                    </>
                                )}
                                {order.status === 'canceled' && (
                                    <>
                                        <XCircle className="text-muted-foreground"/>
                                        <span className="text-xs">Cancelado</span>
                                    </>
                                )}
                                {order.status === 'inProgress' && (
                                    <>
                                        <Loader2 className="animate-spin text-info"/>
                                        <span className="text-xs">En progreso</span>
                                    </>
                                )}
                            </div>
                        </td>
                        <td className="border border-border px-4 py-3">
                            <Button
                                variant="outline"
                                className="bg-background text-foreground border-border hover:bg-muted w-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOrderSelect(order);
                                }}
                            >
                                Detalles
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const VirtualizedOrderHistory: React.FC<VirtualizedOrderHistoryProps> = ({
    orders,
    onOrderSelect,
    height
}) => {
    const { isMobile } = useResponsive();

    const containerHeight = height || (window.innerHeight - 240);
    const itemHeight = isMobile ? 140 : 80;

    // Si no hay órdenes
    if (orders.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                No hay pedidos que mostrar
            </div>
        );
    }

    return (
        <div className="h-full">
            {/* Header solo para desktop */}
            {!isMobile && (
                <div className="sticky top-0 z-10 bg-background border-b border-border mb-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted">
                                <th className="border border-border p-3 text-left font-semibold">Fecha</th>
                                <th className="border border-border p-3 text-left font-semibold">Total</th>
                                <th className="border border-border p-3 text-left font-semibold">Elementos</th>
                                <th className="border border-border p-3 text-left font-semibold">Mesa</th>
                                <th className="border border-border p-3 text-left font-semibold">Estado</th>
                                <th className="border border-border p-3 text-left font-semibold">Acciones</th>
                            </tr>
                        </thead>
                    </table>
                </div>
            )}

            {/* Virtualized List - react-window v2 */}
            <List<RowProps>
                rowComponent={OrderRow}
                rowProps={{
                    orders,
                    onOrderSelect,
                    isMobile
                }}
                rowCount={orders.length}
                rowHeight={itemHeight}
                overscanCount={5}
                style={{
                    height: containerHeight - (isMobile ? 0 : 50),
                    scrollbarWidth: 'thin',
                    overflowX: 'hidden'
                }}
                className="virtualized-order-list"
            />
        </div>
    );
};

export default VirtualizedOrderHistory;
