"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdjustmentListRow } from "@/lib/actions/adjustments";
import { downloadCsv } from "@/lib/utils/csv-export";

export function AdjustmentsHistoryTable({ adjustments }: { adjustments: AdjustmentListRow[] }) {
  function handleExport() {
    downloadCsv(
      "التسويات_المخزنية",
      adjustments.map((a) => ({
        الصنف: a.productName,
        الموقع: a.locationName,
        التغيير: a.quantityChange,
        السبب: a.reasonLabel,
        ملاحظة: a.reasonNote ?? "",
        بواسطة: a.createdByName,
        التاريخ: new Date(a.createdAt).toLocaleString("ar-SA"),
      })),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={adjustments.length === 0}>
          <Download className="ml-2 h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">الموقع</TableHead>
              <TableHead className="text-right">التغيير</TableHead>
              <TableHead className="text-right">السبب</TableHead>
              <TableHead className="text-right">بواسطة</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  لا توجد تسويات مسجَّلة بعد
                </TableCell>
              </TableRow>
            )}
            {adjustments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.productName}</TableCell>
                <TableCell>{a.locationName}</TableCell>
                <TableCell className={a.quantityChange < 0 ? "font-bold text-red-600" : "font-bold text-green-700"}>
                  {a.quantityChange > 0 ? "+" : ""}
                  {a.quantityChange}
                </TableCell>
                <TableCell>
                  {a.reasonLabel}
                  {a.reasonNote && <span className="block text-xs text-muted-foreground">{a.reasonNote}</span>}
                </TableCell>
                <TableCell>{a.createdByName}</TableCell>
                <TableCell className="text-xs">{new Date(a.createdAt).toLocaleString("ar-SA")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
