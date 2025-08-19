import React from "react";
import Product from "@/models/Product.ts";
import OptimizedProductCard from "@/components/ui/OptimizedProductCard";

interface ProductButtonProps extends React.HTMLAttributes<HTMLDivElement> {
    product: Product;
    handleAddToOrder: (product: Product) => void;
    key?: number;
};

const ProductButton: React.FC<ProductButtonProps> = ({
    product,
    handleAddToOrder,
    ...props
}) => {
    return (
        <OptimizedProductCard
            product={product}
            mode="order"
            onAction={handleAddToOrder}
            showCategory={true}
            {...props}
        />
    );
};

export default ProductButton;