import React from "react";
import Product from "@/models/Product.ts";
import ProductCard from "@/components/ui/ProductCard";

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
        <ProductCard
            product={product}
            mode="order"
            onAction={handleAddToOrder}
            showCategory={true}
            {...props}
        />
    );
};

export default ProductButton;