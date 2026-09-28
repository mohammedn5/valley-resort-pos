"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOfflineDb } from "@/lib/db/offline-db";
import { closeShiftOnServer } from "@/lib/actions/shifts";
import { getShiftRefundTotals } from "@/lib/actions/refunds";
import { toEnglishDigits, parseLocalizedFloat } from "@/lib/utils/digits";
import { ZReportPrint, type ShiftSummaryData } from "./z-report-print";

export function ShiftCloseModal({
  shiftId,
  locationId,
  userId,
  locationName,
  cashierName,
  shiftStartTime,
  onClose,
}: {
  shiftId: string;
  locationId: string;
  userId: string;
  locationName: string;
  cashierName: string;
  shiftStartTime: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<ShiftSummaryData | null>(null);
  const [actualCashInput, setActualCashInput] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function computeSummary() {
      const db = getOfflineDb();
      // الإجمالي الإجمالي (Gross) يُحسب من الفواتير المحلية بالكامل (المزامنة
      // والمعلقة معاً) لأن الجهاز هو مصدر الحقيقة الفعلي لما بِيع فعلاً خلال
      // الوردية. المرتجعات تُجلب من السيرفر لأنها عملية إدارية منفصلة تتم على
      // فواتير مُزامَنة بالفعل، ويُطرح صافيها هنا لإعطاء رقم دقيق للمطابقة.
      const orders = await db.local_orders.where("shiftId").equals(shiftId).toArray();
      const refundTotals = await getShiftRefundTotals(shiftId);

      const productMap = new Map<string, { productName: string; quantity: number; total: number }>();
      let totalItemsSold = 0;
      let grossCash = 0;
      let grossCard = 0;

      for (const order of orders) {
        grossCash += order.cashAmount;
        grossCard += order.cardAmount;

        for (const item of order.items) {
          totalItemsSold += item.quantity;
          const existing = productMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += item.subtotal;
          } else {
            productMap.set(item.productId, {
              productName: item.productName,
              quantity: item.quantity,
              total: item.subtotal,
            });
          }
        }
      }

      const netCash = Math.max(0, grossCash - refundTotals.totalRefundCash);
      const netCard = Math.max(0, grossCard - refundTotals.totalRefundCard);

      setSummary({
        locationName,
        cashierName,
        startTime: shiftStartTime,
        endTime: new Date().toISOString(),
        totalOrders: orders.length,
        totalItemsSold,
        grossCash,
        grossCard,
        totalRefundCash: refundTotals.totalRefundCash,
        totalRefundCard: refundTotals.totalRefundCard,
        refundsCount: refundTotals.refundsCount,
        netCash,
        netCard,
        grandTotal: netCash + netCard,
        actualCashCounted: null,
        cashDifference: null,
        productBreakdown: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity),
      });
    }

    void computeSummary();
  }, [shiftId, locationName, cashierName, shiftStartTime]);

  function handleActualCashChange(rawValue: string) {
    setActualCashInput(toEnglishDigits(rawValue).replace(/[^0-9.]/g, ""));
  }

  async function handleConfirmClose() {
    if (!summary) return;

    const actualCashCounted =
      actualCashInput.trim() === "" ? null : parseLocalizedFloat(actualCashInput);

    if (actualCashInput.trim() !== "" && Number.isNaN(actualCashCounted)) {
      setError("قيمة النقد الفعلي غير صالحة");
      return;
    }

    const cashDifference = actualCashCounted !== null ? actualCashCounted - summary.netCash : null;

    const finalSummary: ShiftSummaryData = { ...summary, actualCashCounted, cashDifference };
    setSummary(finalSummary);

    setIsClosing(true);
    setError(null);

    try {
      const db = getOfflineDb();

      await db.local_shifts.put({
        shiftId,
        locationId,
        userId,
        startTime: finalSummary.startTime,
        endTime: finalSummary.endTime,
        totalCash: finalSummary.netCash,
        totalCard: finalSummary.netCard,
        totalRefundCash: finalSummary.totalRefundCash,
        totalRefundCard: finalSummary.totalRefundCard,
        actualCashCounted: finalSummary.actualCashCounted,
        status: "closed",
        syncStatus: "pending",
      });

      // ننتظر جولة رسم واحدة كي يلتقط مكوّن ZReportPrint القيم المحدَّثة
      // (actualCashCounted/cashDifference) قبل استدعاء الطباعة
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.print();

      const result = await closeShiftOnServer({
        shiftId,
        totalCash: finalSummary.netCash,
        totalCard: finalSummary.netCard,
        totalRefundCash: finalSummary.totalRefundCash,
        totalRefundCard: finalSummary.totalRefundCard,
        actualCashCounted,
        endTime: finalSummary.endTime,
      });

      if (result.success) {
        await db.local_shifts.update(shiftId, { syncStatus: "synced" });
      }
      // في حال الفشل (غير متصل بالإنترنت)، تبقى الحالة "pending" وسيتولى محرك
      // المزامنة إعادة المحاولة تلقائياً فور توفر الاتصال.

      router.push(`/pos/${locationId}`);
      router.refresh();
    } catch (err) {
      console.error("فشل إغلاق الوردية:", err);
      setError("تم حفظ الإغلاق محلياً، وستتم مزامنته تلقائياً مع السيرفر فور توفر الاتصال");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
        dir="rtl"
      >
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">تقرير إغلاق الوردية (Z-Report)</h2>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {!summary ? (
            <p className="py-8 text-center text-muted-foreground">جاري حساب ملخص الوردية...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold">{summary.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">عدد الفواتير</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold">{summary.totalItemsSold}</p>
                  <p className="text-xs text-muted-foreground">عدد القطع المباعة</p>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-right">الصنف</th>
                      <th className="p-2 text-right">الكمية</th>
                      <th className="p-2 text-right">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.productBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-muted-foreground">
                          لا توجد مبيعات في هذه الوردية
                        </td>
                      </tr>
                    ) : (
                      summary.productBreakdown.map((product) => (
                        <tr key={product.productName} className="border-t">
                          <td className="p-2">{product.productName}</td>
                          <td className="p-2">{product.quantity}</td>
                          <td className="p-2">{product.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span>إجمالي المبيعات (كاش / شبكة)</span>
                  <span className="font-medium">
                    {summary.grossCash.toFixed(2)} / {summary.grossCard.toFixed(2)}
                  </span>
                </div>
                {summary.refundsCount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>مرتجعات ({summary.refundsCount})</span>
                    <span className="font-medium">
                      -{summary.totalRefundCash.toFixed(2)} / -{summary.totalRefundCard.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span>صافي الكاش</span>
                  <span className="font-bold">{summary.netCash.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span>صافي الشبكة</span>
                  <span className="font-bold">{summary.netCard.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between border-t pt-1 text-base">
                  <span className="font-bold">الإجمالي الكلي</span>
                  <span className="font-extrabold text-primary">{summary.grandTotal.toFixed(2)} ر.س</span>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Label htmlFor="actualCash">النقد الفعلي المعدود في الدرج (اختياري)</Label>
                <Input
                  id="actualCash"
                  type="text"
                  inputMode="decimal"
                  placeholder={`المتوقع: ${summary.netCash.toFixed(2)}`}
                  value={actualCashInput}
                  onChange={(e) => handleActualCashChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  إن أدخلت المبلغ سيُحتسب الفرق (عجز/فائض) تلقائياً ويُطبع على تقرير الإغلاق.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button size="lg" className="w-full" disabled={isClosing} onClick={handleConfirmClose}>
                {isClosing ? "جاري الإغلاق..." : "تأكيد الإغلاق والطباعة"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ZReportPrint data={summary} />
    </>
  );
}
