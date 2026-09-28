import { getLocations } from "@/lib/actions/locations";
import { TransferForm } from "./transfer-form";

export const metadata = {
  title: "تحويل مخزني داخلي | منتجع فالي",
};

export default async function StockTransferPage() {
  const locations = await getLocations();
  const defaultFromLocationId = locations.find((l) => l.type === "warehouse")?.id ?? "";

  return (
    <div dir="rtl" className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">تحويل مخزني داخلي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          انقل كميات من المستودع الرئيسي إلى أي منفذ بيع، أو بين المنافذ مباشرة.
        </p>
      </div>

      <TransferForm locations={locations} defaultFromLocationId={defaultFromLocationId} />
    </div>
  );
}
