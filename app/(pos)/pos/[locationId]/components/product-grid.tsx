"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";

export type PosProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  barcode: string | null;
  categoryId: string;
  stockQuantity: number;
};

const LOW_STOCK_THRESHOLD = 5;

export function ProductGrid({
  products,
  cartQuantities,
  onSelect,
}: {
  products: PosProduct[];
  // الكمية الموجودة حالياً في السلة لكل صنف (id -> quantity) لحساب المتبقي فعلياً
  cartQuantities: Record<string, number>;
  onSelect: (product: PosProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        لا توجد منتجات في هذا التصنيف
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const inCart = cartQuantities[product.id] ?? 0;
        const remaining = product.stockQuantity - inCart;
        const isOutOfStock = remaining <= 0;
        const isLowStock = !isOutOfStock && remaining <= LOW_STOCK_THRESHOLD;

        return (
          <button
            type="button"
            key={product.id}
            disabled={isOutOfStock}
            onClick={() => {
              if (!isOutOfStock) onSelect(product);
            }}
            className={`relative flex flex-col items-center gap-2 rounded-xl border bg-white p-3 text-center shadow-sm transition-transform ${
              isOutOfStock ? "cursor-not-allowed opacity-50" : "active:scale-95"
            }`}
          >
            <span
              className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isOutOfStock
                  ? "bg-red-100 text-red-700"
                  : isLowStock
                    ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isOutOfStock ? "نفدت الكمية" : `متوفر: ${remaining}`}
            </span>

            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
            <span className="text-sm font-bold text-primary">{product.price.toFixed(2)} ر.س</span>
          </button>
        );
      })}
    </div>
  );
}
