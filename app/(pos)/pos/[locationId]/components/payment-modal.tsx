"use client";

import { useState } from "react";
import { Banknote, CreditCard, SplitSquareHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toEnglishDigits, parseLocalizedFloat } from "@/lib/utils/digits";

export type PaymentResult = {
  paymentMethod: "cash" | "card" | "split";
  cashAmount: number;
  cardAmount: number;
};

export function PaymentModal({
  totalAmount,
  onConfirm,
  onClose,
}: {
  totalAmount: number;
  onConfirm: (result: PaymentResult) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"select" | "split">("select");
  const [splitCash, setSplitCash] = useState(totalAmount.toFixed(2));
  const [splitCard, setSplitCard] = useState("0.00");
  const [error, setError] = useState<string | null>(null);

  function handleQuickPay(method: "cash" | "card") {
    onConfirm({
      paymentMethod: method,
      cashAmount: method === "cash" ? totalAmount : 0,
      cardAmount: method === "card" ? totalAmount : 0,
    });
  }

  function handleSplitConfirm() {
    const cash = parseLocalizedFloat(splitCash) || 0;
    const card = parseLocalizedFloat(splitCard) || 0;

    if (Math.abs(cash + card - totalAmount) > 0.01) {
      setError(`مجموع المبلغين (${(cash + card).toFixed(2)}) لا يساوي إجمالي الفاتورة (${totalAmount.toFixed(2)})`);
      return;
    }

    onConfirm({ paymentMethod: "split", cashAmount: cash, cardAmount: card });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">إتمام الدفع</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="mb-6 text-center text-3xl font-extrabold text-primary">
          {totalAmount.toFixed(2)} ر.س
        </p>

        {mode === "select" ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickPay("cash")}
              className="flex flex-col items-center gap-2 rounded-xl bg-green-600 py-8 text-white shadow-md transition-transform active:scale-95"
            >
              <Banknote className="h-10 w-10" />
              <span className="text-lg font-bold">كاش</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay("card")}
              className="flex flex-col items-center gap-2 rounded-xl bg-blue-600 py-8 text-white shadow-md transition-transform active:scale-95"
            >
              <CreditCard className="h-10 w-10" />
              <span className="text-lg font-bold">شبكة</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("split")}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <SplitSquareHorizontal className="h-5 w-5" />
              دفع مقسم (كاش + شبكة)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المبلغ كاش</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={splitCash}
                onChange={(e) => setSplitCash(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label>المبلغ شبكة</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={splitCard}
                onChange={(e) => setSplitCard(toEnglishDigits(e.target.value).replace(/[^0-9.]/g, ""))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setMode("select")}>
                رجوع
              </Button>
              <Button type="button" className="flex-1" onClick={handleSplitConfirm}>
                تأكيد الدفع المقسم
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
