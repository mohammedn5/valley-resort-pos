import { getPurchases } from "@/lib/actions/purchases";
import { getLocations } from "@/lib/actions/locations";
import { PurchasesTable } from "./purchases-table";

export const metadata = {
  title: "فواتير المشتريات | منتجع فالي",
};

export default async function PurchasesListPage() {
  const [purchases, locations] = await Promise.all([getPurchases({ status: "all" }), getLocations()]);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">فواتير المشتريات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            استعرض التفاصيل، عدّل بيانات الفاتورة الأساسية، أو ألغِ فاتورة (يعكس المخزون تلقائياً وبأمان).
          </p>
        </div>
        <a
          href="/purchases/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + فاتورة جديدة
        </a>
      </div>

      <PurchasesTable initialPurchases={purchases} locations={locations} />
    </div>
  );
}
