"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProductLedger, type StockMovementRow } from "@/lib/actions/products";

const TYPE_LABELS: Record<string, string> = {
  purchase: "توريد مشتريات",
  purchase_cancelled: "إلغاء توريد",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
  sale: "بيع",
  refund: "مرتجع",
  adjustment: "تسوية/تالف",
};

export function ProductLedgerModal({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<StockMovementRow[] | null>(null);

  useEffect(() => {
    getProductLedger(productId).then(setMovements);
  }, [productId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">سجل حركة الصنف: {productName}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!movements ? (
          <p className="py-8 text-center text-muted-foreground">جاري التحميل...</p>
        ) : movements.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">لا توجد أي حركة مسجَّلة لهذا الصنف بعد</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الموقع</TableHead>
                  <TableHead className="text-right">التغيير</TableHead>
                  <TableHead className="text-right">الرصيد بعدها</TableHead>
                  <TableHead className="text-right">بواسطة</TableHead>
                  <TableHead className="text-right">ملاحظة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(m.createdAt).toLocaleString("ar-SA")}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[m.type] ?? m.type}</TableCell>
                    <TableCell>{m.locationName}</TableCell>
                    <TableCell className={m.quantityChange < 0 ? "font-bold text-red-600" : "font-bold text-green-700"}>
                      {m.quantityChange > 0 ? "+" : ""}
                      {m.quantityChange}
                    </TableCell>
                    <TableCell>{m.balanceAfter}</TableCell>
                    <TableCell>{m.createdByName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {m.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
