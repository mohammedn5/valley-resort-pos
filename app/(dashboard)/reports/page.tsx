import { getShiftsHistory } from "@/lib/actions/reports";
import { SalesReportTable } from "./sales-report-table";

export const metadata = {
  title: "تقارير المبيعات | منتجع فالي",
};

export default async function SalesReportsPage() {
  const shifts = await getShiftsHistory();

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تقارير المبيعات وسجل الورديات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          آخر 50 وردية مغلقة عبر جميع المنافذ، مع الفرز المالي الكامل والمرتجعات وضبط النقد الفعلي لكل وردية.
        </p>
      </div>

      <SalesReportTable shifts={shifts} />
    </div>
  );
}
