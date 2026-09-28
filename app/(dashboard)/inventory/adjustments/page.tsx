import { getAdjustments } from "@/lib/actions/adjustments";
import { getAdjustmentReasonOptions } from "@/lib/utils/adjustments";
import { getLocations } from "@/lib/actions/locations";
import { AdjustmentForm } from "./adjustment-form";
import { AdjustmentsHistoryTable } from "./adjustments-history-table";

export const metadata = {
  title: "التالف والتسويات | منتجع فالي",
};

export default async function InventoryAdjustmentsPage() {
  const [adjustments, locations] = await Promise.all([getAdjustments(), getLocations()]);
  const reasonOptions = getAdjustmentReasonOptions();

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">التالف، الهدر، وتسويات الجرد</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          سجّل أي تالف أو هدر أو فرق جرد يدوي - يُخصم أو يُضاف للرصيد فوراً ويُوثَّق في سجل حركة الصنف.
        </p>
      </div>

      <AdjustmentForm locations={locations} reasonOptions={reasonOptions} />

      <div>
        <h2 className="mb-3 text-lg font-bold">آخر التسويات المسجَّلة</h2>
        <AdjustmentsHistoryTable adjustments={adjustments} />
      </div>
    </div>
  );
}
