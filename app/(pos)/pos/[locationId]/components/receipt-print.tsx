"use client";

export type ReceiptData = {
  displayNumber: string;
  locationName: string;
  cashierName: string;
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  paymentMethod: "cash" | "card" | "split";
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
  createdAt: string;
};

const paymentLabels: Record<ReceiptData["paymentMethod"], string> = {
  cash: "كاش",
  card: "شبكة",
  split: "مقسم (كاش + شبكة)",
};

/**
 * يُعرض فقط أثناء الطباعة (print:block) ويبقى مخفياً تماماً في الاستخدام العادي.
 * مقاس العرض 80mm يتوافق مع طابعات الإيصالات الحرارية القياسية.
 */
export function ReceiptPrint({ data }: { data: ReceiptData | null }) {
  if (!data) return null;

  const date = new Date(data.createdAt);

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
          <p className="text-sm font-bold">منتجع فالي</p>
          <p>{data.locationName}</p>
          <p>الكاشير: {data.cashierName}</p>
          <p>
            {date.toLocaleDateString("ar-SA")} - {date.toLocaleTimeString("ar-SA")}
          </p>
          <p>رقم الفاتورة: {data.displayNumber}</p>
        </div>

        <hr className="my-2 border-dashed border-black" />

        <table className="w-full text-right">
          <thead>
            <tr>
              <th className="text-right">الصنف</th>
              <th className="text-center">كمية</th>
              <th className="text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="text-right">{item.productName}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-left">{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="my-2 border-dashed border-black" />

        <div className="flex justify-between font-bold">
          <span>الإجمالي</span>
          <span>{data.totalAmount.toFixed(2)} ر.س</span>
        </div>
        <div className="flex justify-between">
          <span>طريقة الدفع</span>
          <span>{paymentLabels[data.paymentMethod]}</span>
        </div>
        {data.paymentMethod === "split" && (
          <>
            <div className="flex justify-between">
              <span>كاش</span>
              <span>{data.cashAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>شبكة</span>
              <span>{data.cardAmount.toFixed(2)}</span>
            </div>
          </>
        )}

        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">شكراً لزيارتكم منتجع فالي</p>
      </div>
    </div>
  );
}
