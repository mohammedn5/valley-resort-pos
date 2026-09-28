import { AlertTriangle } from "lucide-react";
import type { LowStockRow } from "@/lib/actions/dashboard";

export function LowStockWidget({ items }: { items: LowStockRow[] }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h2 className="font-bold">تنبيهات المخزون الحرج</h2>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">لا توجد أصناف منخفضة المخزون حالياً</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li
              key={`${item.productId}-${item.locationId}`}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                item.quantity < 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.locationName} - الحد الأدنى: {item.threshold}
                </p>
              </div>
              <span className={`font-bold ${item.quantity < 0 ? "text-red-700" : "text-amber-700"}`}>
                {item.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
