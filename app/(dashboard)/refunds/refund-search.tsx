"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchOrderForRefund, type RefundableOrder } from "@/lib/actions/refunds";
import { RefundModal } from "./refund-modal";

const PAYMENT_LABELS: Record<string, string> = { cash: "كاش", card: "شبكة", split: "مقسم" };

export function RefundSearch() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<RefundableOrder | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSearching(true);

    try {
      const result = await searchOrderForRefund(query);
      if (!result) {
        setOrder(null);
        setError("لم يتم العثور على فاتورة مطابقة لهذا الرقم");
        return;
      }
      setOrder(result);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="رقم الفاتورة (مثال: A1B2C3D4)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isSearching}>
          <Search className="ml-2 h-4 w-4" /> {isSearching ? "جاري البحث..." : "بحث"}
        </Button>
      </form>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {successMessage && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{successMessage}</p>}

      {order && (
        <div className="space-y-4 rounded-xl border bg-white p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">رقم الفاتورة: </span>
              {order.displayNumber}
            </p>
            <p>
              <span className="text-muted-foreground">المنفذ: </span>
              {order.locationName}
            </p>
            <p>
              <span className="text-muted-foreground">طريقة الدفع: </span>
              {PAYMENT_LABELS[order.paymentMethod]}
            </p>
            <p>
              <span className="text-muted-foreground">التاريخ: </span>
              {new Date(order.createdAt).toLocaleString("ar-SA")}
            </p>
            <p className="col-span-2 font-bold">
              <span className="font-normal text-muted-foreground">الإجمالي: </span>
              {order.totalAmount.toFixed(2)} ر.س
            </p>
          </div>

          <RefundModal
            order={order}
            onDone={(message) => {
              setSuccessMessage(message);
              setOrder(null);
              setQuery("");
            }}
          />
        </div>
      )}
    </div>
  );
}
