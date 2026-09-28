"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePurchaseHeader } from "@/lib/actions/purchases";
import type { PurchaseListRow } from "@/lib/actions/purchases";

export function PurchaseEditModal({
  purchase,
  onClose,
  onSaved,
}: {
  purchase: PurchaseListRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoiceNumber ?? "");
  const [supplierName, setSupplierName] = useState(purchase.supplierName);
  const [purchasedAt, setPurchasedAt] = useState(purchase.purchasedAt.slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await updatePurchaseHeader(purchase.id, {
        invoiceNumber: invoiceNumber.trim() || null,
        supplierName,
        purchasedAt: new Date(purchasedAt),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">تعديل بيانات الفاتورة</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="mb-4 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
          يمكن تعديل رقم الفاتورة، اسم المورد، وتاريخ الشراء فقط. لتصحيح الكميات أو
          الأصناف، ألغِ الفاتورة وسجّل فاتورة توريد جديدة صحيحة.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          <div className="space-y-2">
            <Label>رقم الفاتورة (اختياري)</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>اسم المورد</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>تاريخ الشراء</Label>
            <Input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} required />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </form>
      </div>
    </div>
  );
}
