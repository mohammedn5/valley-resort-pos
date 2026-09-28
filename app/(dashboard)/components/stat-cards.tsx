import { Banknote, CreditCard, Receipt, Store, Wallet } from "lucide-react";
import type { TopStats } from "@/lib/actions/dashboard";

export function StatCards({ stats }: { stats: TopStats }) {
  const cards = [
    {
      label: "إجمالي المبيعات اليوم",
      value: `${stats.totalSalesToday.toFixed(2)} ر.س`,
      icon: Wallet,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "إجمالي الكاش",
      value: `${stats.totalCashToday.toFixed(2)} ر.س`,
      icon: Banknote,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "إجمالي الشبكة",
      value: `${stats.totalCardToday.toFixed(2)} ر.س`,
      icon: CreditCard,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "عدد الفواتير اليوم",
      value: stats.totalOrdersToday.toString(),
      icon: Receipt,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "الورديات النشطة",
      value: `${stats.activeShiftsCount} / ${stats.totalPosLocations}`,
      icon: Store,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
            <card.icon className="h-5 w-5" />
          </div>
          <p className="text-xl font-bold">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
