"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelPurchase } from "@/lib/actions/purchases";
import type { PurchaseListRow } from "@/lib/actions/purchases";

export function PurchaseCancelModal({
  purchase,
  onClose,
  onCancelled,
}: {
  purchase: PurchaseListRow;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await cancelPurchase(purchase.id, reason);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCancelled();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-red-700">
            <AlertTriangle className="h-5 w-5" /> إلغاء فاتورة الشراء
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          سيتم عكس كل الكميات التي أضافتها هذه الفاتورة ({purchase.invoiceNumber ?? purchase.id}) من مخزون{" "}
          {purchase.destinationLocationName} تلقائياً. إن كان جزء من هذه الكمية قد بِيع أو تحوّل لموقع آخر
          بالفعل، سيُرفض الإلغاء مع توضيح الصنف الذي يمنعه بالضبط.
        </p>

        {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mb-4 space-y-2">
          <Label>سبب الإلغاء (اختياري)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: خطأ في إدخال الكمية" />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            تراجع
          </Button>
          <Button type="button" variant="destructive" className="flex-1" disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
          </Button>
        </div>
      </div>
    </div>
  );
}
