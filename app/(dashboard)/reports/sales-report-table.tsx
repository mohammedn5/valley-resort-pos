"use client";

import { Download } from "lucide-react";
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
import type { ShiftHistoryRow } from "@/lib/actions/reports";
import { downloadCsv } from "@/lib/utils/csv-export";

export function SalesReportTable({ shifts }: { shifts: ShiftHistoryRow[] }) {
  function handleExport() {
    downloadCsv(
      "تقرير_المبيعات_والورديات",
      shifts.map((s) => ({
        المنفذ: s.locationName,
        الكاشير: s.cashierName,
        البداية: new Date(s.startTime).toLocaleString("ar-SA"),
        النهاية: s.endTime ? new Date(s.endTime).toLocaleString("ar-SA") : "",
        "عدد الفواتير": s.ordersCount,
        كاش: s.totalCash,
        شبكة: s.totalCard,
        "مرتجعات كاش": s.totalRefundCash,
        "مرتجعات شبكة": s.totalRefundCard,
        الإجمالي: s.totalAmount,
        "الكاش الفعلي": s.actualCashCounted ?? "",
        "الفرق (عجز/فائض)": s.cashDifference ?? "",
      })),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={handleExport} disabled={shifts.length === 0}>
          <Download className="ml-2 h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المنفذ</TableHead>
              <TableHead className="text-right">الكاشير</TableHead>
              <TableHead className="text-right">البداية</TableHead>
              <TableHead className="text-right">النهاية</TableHead>
              <TableHead className="text-right">الفواتير</TableHead>
              <TableHead className="text-right">كاش</TableHead>
              <TableHead className="text-right">شبكة</TableHead>
              <TableHead className="text-right">مرتجعات</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">الفرق النقدي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  لا توجد ورديات مغلقة بعد
                </TableCell>
              </TableRow>
            )}
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">{shift.locationName}</TableCell>
                <TableCell>{shift.cashierName}</TableCell>
                <TableCell className="text-xs">{new Date(shift.startTime).toLocaleString("ar-SA")}</TableCell>
                <TableCell className="text-xs">
                  {shift.endTime ? new Date(shift.endTime).toLocaleString("ar-SA") : "—"}
                </TableCell>
                <TableCell>{shift.ordersCount}</TableCell>
                <TableCell>{shift.totalCash.toFixed(2)}</TableCell>
                <TableCell>{shift.totalCard.toFixed(2)}</TableCell>
                <TableCell className="text-red-600">
                  {shift.totalRefundCash + shift.totalRefundCard > 0
                    ? `-${(shift.totalRefundCash + shift.totalRefundCard).toFixed(2)}`
                    : "—"}
                </TableCell>
                <TableCell className="font-bold">{shift.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  {shift.cashDifference === null ? (
                    <span className="text-muted-foreground">لم يُدخل</span>
                  ) : shift.cashDifference === 0 ? (
                    <Badge variant="secondary">مطابق</Badge>
                  ) : shift.cashDifference > 0 ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      فائض {shift.cashDifference.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">عجز {Math.abs(shift.cashDifference).toFixed(2)}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
