"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, selectCartTotalAmount, selectCartTotalQuantity } from "@/lib/store/cart-store";

export function CartSidebar({
  stockByProductId,
  onCheckout,
}: {
  // الرصيد الأصلي (قبل خصم ما بالسلة) لكل صنف - يُستخدم لتعطيل زر "+" عند
  // الوصول للحد الأقصى المتوفر فعلياً، لمنع بيع كمية أكبر من المخزون
  stockByProductId: Record<string, number>;
  onCheckout: () => void;
}) {
  const items = useCartStore((state) => state.items);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalAmount = useCartStore(selectCartTotalAmount);
  const totalQuantity = useCartStore(selectCartTotalQuantity);

  return (
    <aside className="flex w-full max-w-sm flex-col border-r bg-white">
      <div className="flex items-center gap-2 border-b p-4">
        <ShoppingCart className="h-5 w-5" />
        <h2 className="font-bold">سلة المبيعات</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            السلة فارغة - اختر منتجاً لإضافته
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const stock = stockByProductId[item.productId] ?? Infinity;
              const atMaxStock = item.quantity >= stock;

              return (
                <div key={item.productId} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.unitPrice.toFixed(2)} ر.س</p>
                    {atMaxStock && (
                      <p className="text-xs text-amber-700">تم الوصول للحد الأقصى المتوفر بالمخزون</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => decrementItem(item.productId)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={atMaxStock}
                      onClick={() => incrementItem(item.productId)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="w-16 text-left text-sm font-bold">
                    {(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>عدد القطع</span>
          <span>{totalQuantity}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>الإجمالي</span>
          <span>{totalAmount.toFixed(2)} ر.س</span>
        </div>
        <Button size="lg" className="w-full" disabled={items.length === 0} onClick={onCheckout}>
          إتمام الدفع
        </Button>
      </div>
    </aside>
  );
}
