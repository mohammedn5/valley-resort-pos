"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPurchaseDetail, type PurchaseDetail } from "@/lib/actions/purchases";

export function PurchaseDetailModal({ purchaseId, onClose }: { purchaseId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);

  useEffect(() => {
    getPurchaseDetail(purchaseId).then(setDetail);
  }, [purchaseId]);

  const isPdf = detail?.invoiceImagePath.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">تفاصيل فاتورة الشراء</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!detail ? (
          <p className="py-8 text-center text-muted-foreground">جاري التحميل...</p>
        ) : (
          <div className="space-y-4">
            {detail.status === "cancelled" && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                فاتورة ملغاة بواسطة {detail.cancelledByName} بتاريخ{" "}
                {detail.cancelledAt && new Date(detail.cancelledAt).toLocaleString("ar-SA")}
                {detail.cancellationReason && <> - السبب: {detail.cancellationReason}</>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="text-muted-foreground">رقم الفاتورة: </span>
                {detail.invoiceNumber ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">المورد: </span>
                {detail.supplierName}
              </p>
              <p>
                <span className="text-muted-foreground">الوجهة: </span>
                {detail.destinationLocationName}
              </p>
              <p>
                <span className="text-muted-foreground">التاريخ: </span>
                {new Date(detail.purchasedAt).toLocaleDateString("ar-SA")}
              </p>
              <p>
                <span className="text-muted-foreground">أنشأها: </span>
                {detail.createdByName}
              </p>
              <p className="font-bold">
                <span className="font-normal text-muted-foreground">الإجمالي: </span>
                {detail.totalCost.toFixed(2)} ر.س
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الصنف</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">سعر الشراء</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.costPrice.toFixed(2)}</TableCell>
                      <TableCell>{item.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">صورة الفاتورة</p>
              <div className="overflow-hidden rounded-lg border bg-muted">
                {isPdf ? (
                  <a
                    href={detail.invoiceImagePath}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-2 p-10 text-primary hover:underline"
                  >
                    <FileText className="h-12 w-12" />
                    فتح ملف PDF في نافذة جديدة
                  </a>
                ) : (
                  <div className="relative aspect-[3/4] w-full max-w-sm">
                    <Image
                      src={detail.invoiceImagePath}
                      alt={`صورة فاتورة ${detail.invoiceNumber ?? ""}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
