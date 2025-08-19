import React, { useEffect, useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
    ClockIcon,
    CreditCardIcon,
    EuroIcon,
    PrinterIcon,
    XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/components/ui/use-toast.ts";
import Order from "@/models/Order.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
    isPaymentModalOpen: boolean;
    setIsPaymentModalOpen: (isOpen: boolean) => void;
    cashAmount: string;
    setCashAmount: (amount: string) => void;
    paymentMethod: string;
    setPaymentMethod: (method: string) => void;
    newOrder: Order;
    handleCompleteOrder: (order: Order) => void;
    showTicketDialog: boolean;
    setShowTicketDialog: (show: boolean) => void;

    handleTicketPrintingComplete: (shouldPrintTicket: boolean) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
                                                       isPaymentModalOpen,
                                                       setIsPaymentModalOpen,
                                                       cashAmount,
                                                       showTicketDialog,
                                                       setShowTicketDialog,
                                                       handleTicketPrintingComplete,
                                                       setCashAmount,
                                                       paymentMethod,
                                                       setPaymentMethod,
                                                       newOrder,
                                                       handleCompleteOrder,
                                                   }) => {
    const { isMobile } = useResponsive();
    const [localCashAmount, setLocalCashAmount] = useState(cashAmount);
    const [localPaymentMethod, setLocalPaymentMethod] = useState(paymentMethod);

    useEffect(() => {
        setLocalCashAmount(cashAmount);
        setLocalPaymentMethod(paymentMethod);
    }, [isPaymentModalOpen, cashAmount, paymentMethod]);

    const handleLocalCashInput = useCallback((value: string) => {
        setLocalCashAmount((prevAmount) => {
            if (value === "C") return "";
            if (value === "." && prevAmount.includes(".")) return prevAmount;
            if (value === "." && prevAmount === "") return "0.";
            return prevAmount + value;
        });
    }, []);

    const calculateLocalChange = useCallback(() => {
        const change = parseFloat(localCashAmount) - newOrder.total;
        return change > 0 ? change.toFixed(2) : "0.00";
    }, [localCashAmount, newOrder.total]);

    const handleConfirmPayment = useCallback(() => {

        setShowTicketDialog(true)
        console.log("handleConfirmPayment")
        toast({
            title:
                localPaymentMethod === "pagar_luego"
                    ? "Pago Pendiente"
                    : "Pago Confirmado!",
            description:
                localPaymentMethod === "pagar_luego"
                    ? "La orden se ha registrado como pendiente de pago."
                    : "El pago ha sido procesado exitosamente.",
            duration: 3000,
        });
    }, [
        newOrder,
        localPaymentMethod,
        localCashAmount,
        calculateLocalChange,
        handleCompleteOrder,
    ]);

    const handleCompleteTransaction = useCallback(
        (shouldPrintTicket: boolean) => {
            const updatedOrder = {
                ...newOrder,
                paymentMethod: localPaymentMethod,
                ticketPath: "ticket.pdf",
                status: localPaymentMethod === "pagar_luego" ? "unpaid" : "paid",
                totalPaid: parseFloat(localCashAmount),
                change: parseFloat(calculateLocalChange()),
                items: newOrder.items,
            };
            handleCompleteOrder(updatedOrder);
            handleTicketPrintingComplete(shouldPrintTicket);
            setCashAmount("");
            setPaymentMethod("efectivo");

            if (shouldPrintTicket) {
                toast({
                    title: "Imprimiendo ticket...",
                    description: "El ticket se está imprimiendo.",
                    duration: 3000,
                });
            } else {
                toast({
                    title: "Orden completada",
                    description:
                        localPaymentMethod === "pagar_luego"
                            ? "La orden ha sido registrada como pendiente de pago."
                            : "La orden ha sido completada sin imprimir ticket.",
                    duration: 3000,
                });
            }
        },
        [setIsPaymentModalOpen, setCashAmount, setPaymentMethod, localPaymentMethod]
    );

    const numpadButtons = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        ".",
        "0",
        "C",
    ];

    const handleKeyPress = useCallback(
        (event: KeyboardEvent) => {
            if (localPaymentMethod !== "efectivo") return;

            const key = event.key;
            if (/^[0-9.]$/.test(key) || key === "Backspace") {
                event.preventDefault();
                if (key === "Backspace") {
                    setLocalCashAmount((prev) => prev.slice(0, -1));
                } else {
                    handleLocalCashInput(key);
                }
            }
        },
        [localPaymentMethod, handleLocalCashInput]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleKeyPress]);

    return (
        <>
            {isPaymentModalOpen && (
                <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                    <DialogContent className={cn(
                        "flex flex-col",
                        isMobile 
                            ? "max-w-[100vw] max-h-[100vh] min-h-[100vh] w-full h-full rounded-none border-0" 
                            : "max-w-[90vw] max-h-[95vh] min-h-[500px]"
                    )}>
                        <DialogHeader className={cn(isMobile && "px-4 py-3")}>
                            <DialogTitle className={cn(
                                isMobile ? "text-xl mb-4" : "text-2xl mb-4"
                            )}>Completar Pedido</DialogTitle>
                            
                            <div className={cn(
                                "flex items-center gap-2",
                                isMobile ? "flex-col space-y-2" : "space-x-4"
                            )}>
                                <Button
                                    variant={
                                        localPaymentMethod === "efectivo" ? "default" : "outline"
                                    }
                                    onClick={() => setLocalPaymentMethod("efectivo")}
                                    className={cn(
                                        "flex-1 text-lg",
                                        isMobile ? "h-12 w-full" : "h-10"
                                    )}
                                >
                                    <EuroIcon className={cn("mr-2", isMobile ? "h-6 w-6" : "h-5 w-5")} />
                                    Efectivo
                                </Button>
                                <Button
                                    variant={
                                        localPaymentMethod === "tarjeta" ? "default" : "outline"
                                    }
                                    onClick={() => setLocalPaymentMethod("tarjeta")}
                                    className={cn(
                                        "flex-1 text-lg",
                                        isMobile ? "h-12 w-full" : "h-10"
                                    )}
                                >
                                    <CreditCardIcon className={cn("mr-2", isMobile ? "h-6 w-6" : "h-5 w-5")} />
                                    Tarjeta
                                </Button>
                                <Button
                                    variant={
                                        localPaymentMethod === "pagar_luego" ? "default" : "outline"
                                    }
                                    onClick={() => setLocalPaymentMethod("pagar_luego")}
                                    className={cn(
                                        "flex-1 text-lg",
                                        isMobile ? "h-12 w-full" : "h-10"
                                    )}
                                >
                                    <ClockIcon className={cn("mr-2", isMobile ? "h-6 w-6" : "h-5 w-5")} />
                                    Pagar Luego
                                </Button>
                            </div>
                        </DialogHeader>
                        <AnimatePresence>
                            <div className={cn(
                                "w-full mx-auto h-full",
                                isMobile ? "px-4 py-2" : "max-w-full"
                            )}>
                                {localPaymentMethod === "efectivo" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ duration: 0.3 }}
                                        className={cn(
                                            "grid gap-6",
                                            isMobile ? "grid-cols-1" : "grid-cols-2 gap-8"
                                        )}
                                    >
                                        <div className={cn(
                                            "space-y-4",
                                            isMobile && "order-2"
                                        )}>
                                            <Label className={cn(
                                                isMobile ? "text-lg" : "text-xl"
                                            )}>Cantidad en Efectivo</Label>
                                            <div className={cn(
                                                "grid grid-cols-3",
                                                isMobile ? "gap-2" : "gap-3"
                                            )}>
                                                <AnimatePresence>
                                                    {numpadButtons.map((key, index) => (
                                                        <motion.div
                                                            key={key}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{
                                                                duration: 0.4,
                                                                delay: index * 0.03,
                                                            }}
                                                        >
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => handleLocalCashInput(key)}
                                                                className={cn(
                                                                    "w-full bg-input border border-border font-bold hover:bg-input/80 transition-all duration-150",
                                                                    isMobile 
                                                                        ? "h-18 text-2xl active:scale-95 touch-manipulation" 
                                                                        : "h-20 text-3xl hover:scale-105 active:scale-95"
                                                                )}
                                                            >
                                                                {key}
                                                            </Button>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <Card className={cn(
                                            "w-full",
                                            isMobile && "order-1"
                                        )}>
                                            <CardContent className={cn(
                                                isMobile ? "p-4" : "p-6"
                                            )}>
                                                <NumberFlowGroup>
                                                    <div className="space-y-6">
                                                        <div className="flex justify-between items-center">
                                <span className={cn(
                                    "font-semibold",
                                    isMobile ? "text-2xl" : "text-4xl"
                                )}>
                                  Total:
                                </span>
                                                            <span className={cn(
                                                                "font-bold text-primary bg-primary/10 px-3 py-1 rounded-md",
                                                                isMobile ? "text-3xl" : "text-7xl"
                                                            )}>
                                  <NumberFlow 
                                    value={newOrder.total}
                                    format={{ 
                                        minimumFractionDigits: 2,
                                        style: 'currency',
                                        currency: 'EUR',
                                        currencyDisplay: 'symbol'
                                    }}
                                    transformTiming={{ duration: 500, easing: 'ease-out' }}
                                    opacityTiming={{ duration: 250, easing: 'ease-out' }}
                                    willChange
                                    style={{
                                        fontVariantNumeric: 'tabular-nums',
                                        '--number-flow-char-height': '0.85em',
                                        '--number-flow-mask-height': '0.3em'
                                    } as React.CSSProperties}
                                  />
                                </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                <span className={cn(
                                    "font-semibold",
                                    isMobile ? "text-lg" : "text-2xl"
                                )}>
                                  Cantidad Ingresada:
                                </span>
                                                            <span className={cn(
                                                                "font-bold text-card-foreground bg-card px-3 py-1 rounded-md border border-border",
                                                                isMobile ? "text-xl" : "text-2xl"
                                                            )}>
                                  <NumberFlow 
                                    value={parseFloat(localCashAmount) || 0}
                                    format={{ 
                                        minimumFractionDigits: 2,
                                        style: 'currency',
                                        currency: 'EUR',
                                        currencyDisplay: 'symbol'
                                    }}
                                    transformTiming={{ duration: 400, easing: 'ease-out' }}
                                    opacityTiming={{ duration: 200, easing: 'ease-out' }}
                                    willChange
                                    style={{
                                        fontVariantNumeric: 'tabular-nums',
                                        '--number-flow-char-height': '0.85em',
                                        '--number-flow-mask-height': '0.25em'
                                    } as React.CSSProperties}
                                  />
                                </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                <span className={cn(
                                    "font-semibold",
                                    isMobile ? "text-lg" : "text-2xl"
                                )}>
                                  Cambio:
                                </span>
                                                            <span className={cn(
                                                                "font-bold text-accent-foreground bg-accent px-3 py-1 rounded-md",
                                                                isMobile ? "text-xl" : "text-2xl"
                                                            )}>
                                  <NumberFlow 
                                    value={parseFloat(calculateLocalChange())}
                                    format={{ 
                                        minimumFractionDigits: 2,
                                        style: 'currency',
                                        currency: 'EUR',
                                        currencyDisplay: 'symbol'
                                    }}
                                    transformTiming={{ duration: 400, easing: 'ease-out' }}
                                    opacityTiming={{ duration: 200, easing: 'ease-out' }}
                                    willChange
                                    style={{
                                        fontVariantNumeric: 'tabular-nums',
                                        '--number-flow-char-height': '0.85em',
                                        '--number-flow-mask-height': '0.25em'
                                    } as React.CSSProperties}
                                  />
                                </span>
                                                        </div>
                                                    </div>
                                                </NumberFlowGroup>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </div>
                            {localPaymentMethod !== "efectivo" && (
                                <Card className="w-full max-w-full mx-auto">
                                    <CardContent className={cn(
                                        isMobile ? "p-4" : "p-6"
                                    )}>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className={cn(
                                                    "font-semibold",
                                                    isMobile ? "text-xl" : "text-2xl"
                                                )}>Total:</span>
                                                <span className={cn(
                                                    "font-bold text-card-foreground bg-card px-3 py-1 rounded-md border border-border",
                                                    isMobile ? "text-xl" : "text-2xl"
                                                )}>
                          {newOrder.total.toFixed(2)}€
                        </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={cn(
                                                    isMobile ? "text-base" : "text-lg"
                                                )}>Cantidad Ingresada:</span>
                                                <span className={cn(
                                                    "font-bold text-card-foreground bg-card px-3 py-1 rounded-md border border-border",
                                                    isMobile ? "text-lg" : "text-2xl"
                                                )}>
                          {localCashAmount}€
                        </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={cn(
                                                    isMobile ? "text-base" : "text-lg"
                                                )}>Cambio:</span>
                                                <span className={cn(
                                                    "font-bold text-accent-foreground bg-accent px-3 py-1 rounded-md",
                                                    isMobile ? "text-lg" : "text-2xl"
                                                )}>
                          {calculateLocalChange()}€
                        </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </AnimatePresence>
                        <DialogFooter className={cn(
                            "gap-2",
                            isMobile ? "flex-col px-4 pb-4 pt-2" : "flex-row"
                        )}>
                            <Button
                                variant="outline"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className={cn(
                                    "text-foreground hover:bg-primary/10 w-full font-semibold",
                                    isMobile ? "h-12 text-base order-2" : "h-14 text-lg mt-4"
                                )}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className={cn(
                                    "w-full font-semibold",
                                    isMobile ? "h-12 text-base order-1" : "h-14 text-lg mt-4"
                                )}
                                onClick={handleConfirmPayment}
                            >
                                {localPaymentMethod === "pagar_luego"
                                    ? "Confirmar Pedido"
                                    : "Confirmar Pago"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <AnimatePresence>
                {showTicketDialog && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog} >
                            <DialogContent className={cn(
                                isMobile 
                                    ? "max-w-[95vw] max-h-[80vh] w-full" 
                                    : "sm:max-w-[625px]"
                            )}>
                                <DialogHeader className={cn(isMobile && "px-2 py-4")}>
                                    <DialogTitle className={cn(
                                        "text-center",
                                        isMobile ? "text-2xl" : "text-4xl"
                                    )}>¿Desea imprimir el ticket?</DialogTitle>
                                </DialogHeader>
                                <div className={cn(
                                    "flex justify-center mt-6",
                                    isMobile ? "flex-col gap-3 px-2" : "space-x-4"
                                )}>
                                    <Button
                                        onClick={() => handleCompleteTransaction(true)}
                                        className={cn(
                                            "flex-1",
                                            isMobile ? "h-16 text-lg" : "h-24 text-2xl"
                                        )}
                                    >
                                        <PrinterIcon className={cn(
                                            "mr-2",
                                            isMobile ? "h-5 w-5" : "h-6 w-6"
                                        )} />
                                        Sí, imprimir
                                    </Button>
                                    <Button
                                        onClick={() => handleCompleteTransaction(false)}
                                        variant="outline"
                                        className={cn(
                                            "flex-1",
                                            isMobile ? "h-16 text-lg" : "h-24 text-2xl"
                                        )}
                                    >
                                        <XIcon className={cn(
                                            "mr-2",
                                            isMobile ? "h-5 w-5" : "h-6 w-4"
                                        )} />
                                        No, gracias
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PaymentModal;
