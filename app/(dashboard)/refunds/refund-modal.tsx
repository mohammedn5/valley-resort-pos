"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createRefund, type RefundableOrder } from "@/lib/actions/refunds";
import { toEnglishDigits, parseLocalizedInt, parseLocalizedFloat } from "@/lib/utils/digits";

export function RefundModal({
  order,
  onDone,
}: {
  order: RefundableOrder;
  onDone: (message: string) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(order.items.map((item) => [item.orderItemId, "0"])),
  );
  const [reason, setReason] = useState("");
  const [cashAmount, setCashAmount] = useState("0");
  const [cardAmount, setCardAmount] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedTotal = useMemo(() => {
    return order.items.reduce((sum, item) => {
      const qty = parseLocalizedInt(quantities[item.orderItemId] ?? "0") || 0;
      return sum + qty * item.unitPrice;
    }, 0);
  }, [quantities, order.items]);

  function handleQuantityChange(orderItemId: string, rawValue: string, max: number) {
    const normalized = toEnglishDigits(rawValue).replace(/[^0-9]/g, "");
    const parsed = parseInt(normalized || "0", 10);
    const clamped = Number.isNaN(parsed) ? 0 : Math.min(parsed, max);
    setQuantities((prev) => ({ ...prev, [orderItemId]: String(clamped) }));
  }

  function applySuggestedSplit() {
    // توزيع افتراضي مبسّط: نفس نسبة الدفع الأصلية للفاتورة تُطبَّق على مبلغ الاسترجاع
    const originalTotal = order.cashAmount + order.cardAmount || 1;
    const cashRatio = order.cashAmount / originalTotal;
    setCashAmount((suggestedTotal * cashRatio).toFixed(2));
    setCardAmount((suggestedTotal * (1 - cashRatio)).toFixed(2));
  }

  async function handleSubmit() {
    setError(null);

    const items = order.items
      .map((item) => ({ orderItemId: item.orderItemId, quantity: parseLocalizedInt(quantities[item.orderItemId] ?? "0") || 0 }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setError("يجب تحديد كمية واحدة على الأقل للاسترجاع");
      return;
    }

    const cash = parseLocalizedFloat(cashAmount) || 0;
    const card = parseLocalizedFloat(cardAmount) || 0;

    if (cash + card <= 0) {
      setError("مبلغ الاسترجاع يجب أن يكون أكبر من صفر");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRefund({
        orderId: order.orderId,
        items,
        cashAmount: cash,
        cardAmount: card,
        reason,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onDone("تم تنفيذ الاسترجاع بنجاح وتحديث المخزون");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">الكمية الأصلية</TableHead>
              <TableHead className="text-right">مسترجع سابقاً</TableHead>
              <TableHead className="text-right">القابل للاسترجاع</TableHead>
              <TableHead className="w-28 text-right">كمية الاسترجاع الآن</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.orderItemId}>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.alreadyRefundedQuantity}</TableCell>
                <TableCell>{item.refundableQuantity}</TableCell>
                <TableCell>
                  <Input
                    type="text"
                    inputMode="numeric"
                    disabled={item.refundableQuantity === 0}
                    value={quantities[item.orderItemId]}
                    onChange={(e) => handleQuantityChange(item.orderItemId, e.target.value, item.refundableQuantity)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        القيمة المقترحة للاسترجاع بناءً على الكميات المحددة: <span className="font-bold text-foreground">{suggestedTotal.toFixed(2)} ر.س</span>{" "}
        <button type="button" onClick={applySuggestedSplit} className="text-primary underline">
          (تطبيق تلقائي)
        </button>
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>المبلغ المسترجع كاش</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={cashAmount}
            onChange={(e) => setCashAmount(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div className="space-y-2">
          <Label>المبلغ المسترجع شبكة</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={cardAmount}
            onChange={(e) => setCardAmount(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ""))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>سبب الاسترجاع (اختياري)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: الزبون غيّر رأيه" />
      </div>

      {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <Button size="lg" className="w-full" disabled={isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "جاري تنفيذ الاسترجاع..." : "تأكيد الاسترجاع"}
      </Button>
    </div>
  );
}
