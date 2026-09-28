"use client";

export type ShiftSummaryData = {
  locationName: string;
  cashierName: string;
  startTime: string;
  endTime: string;
  totalOrders: number;
  totalItemsSold: number;
  // إجمالي المبيعات قبل خصم المرتجعات
  grossCash: number;
  grossCard: number;
  // إجمالي المرتجعات المسجَّلة على هذه الوردية
  totalRefundCash: number;
  totalRefundCard: number;
  refundsCount: number;
  // الصافي بعد خصم المرتجعات (هذا ما يُحفظ في Shift.totalCash/totalCard)
  netCash: number;
  netCard: number;
  grandTotal: number;
  // ضبط الدرج النقدي
  actualCashCounted: number | null;
  cashDifference: number | null;
  productBreakdown: { productName: string; quantity: number; total: number }[];
};

export function ZReportPrint({ data }: { data: ShiftSummaryData | null }) {
  if (!data) return null;

  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const hasCashCount = data.actualCashCounted !== null && data.cashDifference !== null;
  const differenceLabel =
    data.cashDifference !== null && data.cashDifference < 0
      ? "عجز"
      : data.cashDifference !== null && data.cashDifference > 0
        ? "فائض"
        : "مطابق";

  return (
    <div className="hidden print:block" dir="rtl">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
          }
        }
      `}</style>

      <div style={{ width: "80mm", fontFamily: "monospace" }} className="p-2 text-xs">
        <div className="text-center">
          <p className="text-sm font-bold">تقرير إغلاق الوردية (Z-Report)</p>
          <p>منتجع فالي - {data.locationName}</p>
          <p>الكاشير: {data.cashierName}</p>
          <p>
            من: {start.toLocaleDateString("ar-SA")} {start.toLocaleTimeString("ar-SA")}
          </p>
          <p>
            إلى: {end.toLocaleDateString("ar-SA")} {end.toLocaleTimeString("ar-SA")}
          </p>
        </div>

        <hr className="my-2 border-dashed border-black" />

        <div className="flex justify-between">
          <span>عدد الفواتير</span>
          <span>{data.totalOrders}</span>
        </div>
        <div className="flex justify-between">
          <span>عدد القطع المباعة</span>
          <span>{data.totalItemsSold}</span>
        </div>

        <hr className="my-2 border-dashed border-black" />

        <p className="mb-1 font-bold">تفصيل الأصناف المباعة</p>
        <table className="w-full text-right">
          <thead>
            <tr>
              <th className="text-right">الصنف</th>
              <th className="text-center">كمية</th>
              <th className="text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {data.productBreakdown.map((product) => (
              <tr key={product.productName}>
                <td className="text-right">{product.productName}</td>
                <td className="text-center">{product.quantity}</td>
                <td className="text-left">{product.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="my-2 border-dashed border-black" />

        <div className="flex justify-between">
          <span>إجمالي المبيعات - كاش</span>
          <span>{data.grossCash.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>إجمالي المبيعات - شبكة</span>
          <span>{data.grossCard.toFixed(2)}</span>
        </div>

        {data.refundsCount > 0 && (
          <>
            <div className="flex justify-between">
              <span>مرتجعات ({data.refundsCount}) - كاش</span>
              <span>-{data.totalRefundCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>مرتجعات ({data.refundsCount}) - شبكة</span>
              <span>-{data.totalRefundCard.toFixed(2)}</span>
            </div>
          </>
        )}

        <hr className="my-2 border-dashed border-black" />

        <div className="flex justify-between font-bold">
          <span>الصافي - كاش</span>
          <span>{data.netCash.toFixed(2)} ر.س</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>الصافي - شبكة</span>
          <span>{data.netCard.toFixed(2)} ر.س</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black pt-1 font-bold">
          <span>الإجمالي الكلي</span>
          <span>{data.grandTotal.toFixed(2)} ر.س</span>
        </div>

        {hasCashCount && (
          <>
            <hr className="my-2 border-dashed border-black" />
            <div className="flex justify-between">
              <span>الكاش المتوقع (نظام)</span>
              <span>{data.netCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>الكاش الفعلي (معدود)</span>
              <span>{data.actualCashCounted!.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-black pt-1 font-bold">
              <span>{differenceLabel}</span>
              <span>{Math.abs(data.cashDifference!).toFixed(2)} ر.س</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
