import React from "react";
import Product from "@/models/Product.ts";
import ProductButton from "@/components/ProductButton.tsx";
import {OrderItem} from "@/models/Order.ts";
import { ScrollArea } from "@/components/ui/scroll-area";



type ProductGridProps = {
    products: Product[];
    handleAddToOrder: (product: Product | OrderItem) => void;
    selectedOrderId?: number | null;
};
const ProductGrid: React.FC<ProductGridProps> = ({
                                                     products,
                                                     handleAddToOrder,
                                                     selectedOrderId
                                                 }) => {
    if (!selectedOrderId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <div className="text-6xl mb-4">🍽️</div>
                    <p className="text-xl font-medium mb-2">Selecciona una mesa</p>
                    <p className="text-sm">Elige una mesa para comenzar a agregar productos</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full bg-background">
            {products.length > 0 ? (
                <ScrollArea className="h-full">
                    <div className="p-3">
                        <div className="grid grid-cols-2 gap-3">
                            {products.map((product) => (
                                <div key={product.id}>
                                    <ProductButton
                                        product={product}
                                        handleAddToOrder={handleAddToOrder}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            ) : (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <div className="text-4xl mb-3">📦</div>
                        <p className="text-lg font-medium">No hay productos disponibles</p>
                        <p className="text-sm">Esta categoría no tiene productos</p>
                    </div>
                </div>
            )}
        </div>
    )
};

export default ProductGrid;
