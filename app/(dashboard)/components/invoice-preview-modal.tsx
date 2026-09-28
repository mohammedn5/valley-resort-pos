"use client";

import Image from "next/image";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecentPurchaseRow } from "@/lib/actions/dashboard";

export function InvoicePreviewModal({
  purchase,
  onClose,
}: {
  purchase: RecentPurchaseRow;
  onClose: () => void;
}) {
  const isPdf = purchase.invoiceImagePath.toLowerCase().endsWith(".pdf");
  const purchasedAt = new Date(purchase.purchasedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">فاتورة رقم {purchase.invoiceNumber ?? "—"}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-4 space-y-1 text-sm text-muted-foreground">
          <p>المورد: {purchase.supplierName}</p>
          <p>الوجهة: {purchase.destinationLocationName}</p>
          <p>
            التاريخ: {purchasedAt.toLocaleDateString("ar-SA")} - {purchasedAt.toLocaleTimeString("ar-SA")}
          </p>
          <p className="font-bold text-foreground">الإجمالي: {purchase.totalCost.toFixed(2)} ر.س</p>
        </div>

        <div className="overflow-hidden rounded-lg border bg-muted">
          {isPdf ? (
            <a
              href={purchase.invoiceImagePath}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 p-10 text-primary hover:underline"
            >
              <FileText className="h-12 w-12" />
              فتح ملف PDF في نافذة جديدة
            </a>
          ) : (
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={purchase.invoiceImagePath}
                alt={`صورة فاتورة ${purchase.invoiceNumber ?? ""}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
