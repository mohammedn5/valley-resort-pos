"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecentPurchaseRow } from "@/lib/actions/dashboard";
import { InvoicePreviewModal } from "./invoice-preview-modal";

export function RecentPurchasesTable({ purchases }: { purchases: RecentPurchaseRow[] }) {
  const [selectedPurchase, setSelectedPurchase] = useState<RecentPurchaseRow | null>(null);

  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-bold">أحدث فواتير المشتريات</h2>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">رقم الفاتورة</TableHead>
              <TableHead className="text-right">المورد</TableHead>
              <TableHead className="text-right">الوجهة</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  لا توجد عمليات شراء مسجلة بعد
                </TableCell>
              </TableRow>
            )}
            {purchases.map((purchase) => (
              <TableRow key={purchase.id} className={purchase.status === "cancelled" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{purchase.invoiceNumber ?? "—"}</TableCell>
                <TableCell>{purchase.supplierName}</TableCell>
                <TableCell>{purchase.destinationLocationName}</TableCell>
                <TableCell>{purchase.totalCost.toFixed(2)} ر.س</TableCell>
                <TableCell>{new Date(purchase.purchasedAt).toLocaleDateString("ar-SA")}</TableCell>
                <TableCell>
                  <Badge variant={purchase.status === "active" ? "secondary" : "destructive"}>
                    {purchase.status === "active" ? "نشطة" : "ملغاة"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPurchase(purchase)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedPurchase && (
        <InvoicePreviewModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />
      )}
    </div>
  );
}
