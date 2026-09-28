import { prisma } from "@/lib/prisma";
import { InventoryTable, type InventoryRow } from "./inventory-table";

export const metadata = {
  title: "المخزون الحالي | منتجع فالي",
};

export default async function InventoryPage() {
  const [locations, stocks] = await Promise.all([
    prisma.location.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.inventoryStock.findMany({
      include: {
        product: { include: { category: true } },
        location: true,
      },
      orderBy: [{ product: { name: "asc" } }],
    }),
  ]);

  const rows: InventoryRow[] = stocks.map((stock) => ({
    id: stock.id,
    productName: stock.product.name,
    categoryName: stock.product.category.name,
    barcode: stock.product.barcode,
    locationId: stock.locationId,
    locationName: stock.location.name,
    locationType: stock.location.type,
    quantity: Number(stock.quantity),
  }));

  return (
    <div dir="rtl" className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">المخزون الحالي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          استعرض وفلتر أرصدة كل صنف موزعة على المستودع الرئيسي ومنافذ البيع.
        </p>
      </div>

      <InventoryTable
        rows={rows}
        locations={locations.map((l) => ({ id: l.id, name: l.name, type: l.type }))}
      />
    </div>
  );
}
