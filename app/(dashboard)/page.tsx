import { getDashboardData } from "@/lib/actions/dashboard";
import { StatCards } from "./components/stat-cards";
import { LocationBreakdownTable } from "./components/location-breakdown-table";
import { LowStockWidget } from "./components/low-stock-widget";
import { RecentPurchasesTable } from "./components/recent-purchases-table";

export const metadata = {
  title: "لوحة التحكم | منتجع فالي",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم الرئيسية</h1>
        <p className="mt-1 text-sm text-muted-foreground">نظرة سريعة على أداء المنتجع اليوم.</p>
      </div>

      <StatCards stats={data.topStats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LocationBreakdownTable rows={data.locationBreakdown} />
        </div>
        <div>
          <LowStockWidget items={data.lowStockItems} />
        </div>
      </div>

      <RecentPurchasesTable purchases={data.recentPurchases} />
    </div>
  );
}
