import { getLocations } from "@/lib/actions/locations";
import { PurchaseForm } from "./purchase-form";

export const metadata = {
  title: "إضافة فاتورة مشتريات | منتجع فالي",
};

export default async function NewPurchasePage() {
  const locations = await getLocations();

  return (
    <div dir="rtl" className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">إضافة فاتورة مشتريات جديدة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          سجّل عملية توريد بضاعة جديدة إلى المستودع الرئيسي أو مباشرة لأحد منافذ البيع.
        </p>
      </div>

      <PurchaseForm locations={locations} />
    </div>
  );
}
