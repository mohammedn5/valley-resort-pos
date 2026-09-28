import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { RefundSearch } from "./refund-search";

export const metadata = {
  title: "المرتجعات | منتجع فالي",
};

export default async function RefundsPage() {
  const session = await requireSession();

  if (!session.permissions.includes("pos.refund")) {
    redirect("/");
  }

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">المرتجعات وإلغاء الفواتير</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ابحث برقم الفاتورة (المطبوع على الإيصال) لاسترجاع فاتورة كاملة أو أصناف محددة منها.
        </p>
      </div>

      <RefundSearch />
    </div>
  );
}
