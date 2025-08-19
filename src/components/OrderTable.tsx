"use client"

import React, { useRef, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { MinusIcon, PlusIcon } from "lucide-react"
import Order, {OrderItem} from "@/models/Order"
import { motion, AnimatePresence } from "framer-motion"
import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import { useResponsive } from "@/hooks/useResponsive"

type OrderTableProps = {
    order: Order
    handleRemoveFromOrder: (orderId: number, productId: number) => void
    handleAddToOrder: (orderId: number, product: OrderItem) => void
    disableAnimations?: boolean
}

const OrderTable: React.FC<OrderTableProps> = ({order, handleRemoveFromOrder, handleAddToOrder, disableAnimations = false}) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const { isMobile, isTouch } = useResponsive();
    

    

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (tableRef.current) {
                e.preventDefault();
                tableRef.current.scrollTop += e.deltaY;
            }
        };

        const currentRef = tableRef.current;
        if (currentRef) {
            currentRef.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener('wheel', handleWheel);
            }
        };
    }, []);

    // Mobile card view for better touch experience
    if (isMobile) {
        return (
            <div className="w-full space-y-2 p-2">
                <AnimatePresence mode="popLayout">
                    {order.items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ 
                                opacity: 0, 
                                x: 50, 
                                scale: 0.95,
                            }}
                            animate={{ 
                                opacity: 1, 
                                x: 0, 
                                scale: 1,
                            }}
                            exit={{ 
                                opacity: 0, 
                                x: -50, 
                                scale: 0.95,
                            }}
                            transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                            layout
                            layoutId={`order-item-${item.id}`}
                            className="bg-card border rounded-lg p-3 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-card-foreground truncate">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        €{(item.price * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 ml-3">
                                    <div className="text-center">
                                        <NumberFlow 
                                            value={item.quantity}
                                            format={{ minimumFractionDigits: 0 }}
                                            className="text-base font-semibold"
                                        />
                                        <p className="text-xs text-muted-foreground">cant.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-11 w-11 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                            onClick={() => handleRemoveFromOrder(order.id, item.id)}
                                        >
                                            <MinusIcon className="h-5 w-5"/>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-11 w-11 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                                            onClick={() => handleAddToOrder(order.id, item)}
                                        >
                                            <PlusIcon className="h-5 w-5"/>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )
    }

    // Desktop table view with larger buttons for touch
    const buttonSize = isTouch ? "h-11 w-11" : "h-8 w-8"
    const iconSize = isTouch ? "h-5 w-5" : "h-4 w-4"
    
    return (
        <div className="w-full overflow-hidden">
            <Table className="table-fixed w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-muted-foreground text-left sticky top-0 bg-card z-10 w-[45%] px-2">Producto</TableHead>
                        <TableHead className="text-muted-foreground text-center sticky top-0 bg-card z-10 w-[15%] px-1">Cant.</TableHead>
                        <TableHead className="text-muted-foreground text-right sticky top-0 bg-card z-10 w-[20%] px-1">Precio</TableHead>
                        <TableHead className="text-muted-foreground text-center sticky top-0 bg-card z-10 w-[20%] px-1">Acc.</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {disableAnimations ? (
                        // Static version without animations
                        order.items.map((item) => (
                            <tr key={item.id} className="border-b">
                                <TableCell className="text-card-foreground text-left w-[45%] px-2">
                                    <span className="font-medium text-sm leading-tight block truncate">
                                        {item.name}
                                    </span>
                                </TableCell>
                                <TableCell className="text-foreground text-center text-base w-[15%] px-1">
                                    <div className="flex items-center justify-center h-8 w-full">
                                        <span className="font-medium text-center">
                                            {item.quantity}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-success font-semibold text-right text-base w-[25%] px-2">
                                    <div className="font-bold text-success">
                                        {(item.price * item.quantity).toFixed(2)}€
                                    </div>
                                </TableCell>
                                <TableCell className="w-[15%] px-1">
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 touch-manipulation"
                                            onClick={() => handleAddToOrder(order.id, item)}
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation"
                                            onClick={() => handleRemoveFromOrder(order.id, item.id)}
                                        >
                                            <MinusIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </tr>
                        ))
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {order.items.map((item, index) => (
                                <motion.tr
                                    key={item.id}
                                    className="border-b"
                                    initial={{ 
                                        opacity: 0, 
                                        x: 50, 
                                        scale: 0.95,
                                        backgroundColor: "hsl(var(--primary) / 0.1)"
                                    }}
                                    animate={{ 
                                        opacity: 1, 
                                        x: 0, 
                                        scale: 1,
                                        backgroundColor: "transparent"
                                    }}
                                    exit={{ 
                                        opacity: 0, 
                                        x: -50, 
                                        scale: 0.95,
                                        backgroundColor: "hsl(var(--destructive) / 0.1)"
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        delay: index * 0.05,
                                        ease: [0.4, 0, 0.2, 1],
                                        backgroundColor: { duration: 2, delay: 0.3 }
                                    }}
                                    layout
                                    layoutId={`order-item-${item.id}`}
                                    whileHover={{ backgroundColor: "hsl(var(--accent) / 0.05)" }}
                                >
                                <TableCell className="text-card-foreground text-left w-[45%] px-2">
                                    <motion.span 
                                        className="font-medium text-sm leading-tight block truncate"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                                    >
                                        {item.name}
                                    </motion.span>
                                </TableCell>
                                <TableCell className="text-foreground text-center text-base w-[15%] px-1">
                                    <NumberFlowGroup>
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ 
                                                duration: 0.3,
                                                delay: 0.2 + index * 0.05,
                                                type: "spring",
                                                stiffness: 200
                                            }}
                                            style={{ display: 'inline-block' }}
                                        >
                                            <NumberFlow 
                                                value={item.quantity}
                                                format={{ minimumFractionDigits: 0 }}
                                                transformTiming={{ duration: 350, easing: 'ease-out' }}
                                                opacityTiming={{ duration: 150, easing: 'ease-out' }}
                                                isolate
                                                style={{
                                                    fontVariantNumeric: 'tabular-nums',
                                                    '--number-flow-char-height': '0.85em',
                                                    '--number-flow-mask-height': '0.2em'
                                                } as React.CSSProperties}
                                            />
                                        </motion.div>
                                    </NumberFlowGroup>
                                </TableCell>
                                <TableCell className="text-foreground text-right text-sm w-[20%] px-1">
                                    <NumberFlowGroup>
                                        <motion.div
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ 
                                                duration: 0.3,
                                                delay: 0.25 + index * 0.05
                                            }}
                                            style={{ display: 'inline-block' }}
                                        >
                                            <NumberFlow 
                                                value={item.price * item.quantity}
                                                format={{ 
                                                    minimumFractionDigits: 2,
                                                    style: 'currency',
                                                    currency: 'EUR',
                                                    currencyDisplay: 'symbol'
                                                }}
                                                transformTiming={{ duration: 350, easing: 'ease-out' }}
                                                opacityTiming={{ duration: 150, easing: 'ease-out' }}
                                                isolate
                                                style={{
                                                    fontVariantNumeric: 'tabular-nums',
                                                    '--number-flow-char-height': '0.85em',
                                                    '--number-flow-mask-height': '0.2em'
                                                } as React.CSSProperties}
                                            />
                                        </motion.div>
                                    </NumberFlowGroup>
                                </TableCell>
                                <TableCell className="w-[20%] px-1">
                                    <motion.div 
                                        className="flex justify-center gap-1"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ 
                                            duration: 0.3,
                                            delay: 0.3 + index * 0.05,
                                            type: "spring",
                                            stiffness: 150
                                        }}
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`${buttonSize} p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10 border-destructive/20`}
                                                onClick={() => handleRemoveFromOrder(order.id, item.id)}
                                            >
                                                <MinusIcon className={iconSize}/>
                                            </Button>
                                        </motion.div>
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`${buttonSize} p-0 text-primary hover:text-primary/80 hover:bg-primary/10 border-primary/20`}
                                                onClick={() => handleAddToOrder(order.id, item)}
                                            >
                                                <PlusIcon className={iconSize}/>
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                </TableCell>
                            </motion.tr>
                            ))}
                        </AnimatePresence>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default OrderTable