import { getProductsForAdmin } from "@/lib/actions/products";
import { getCategoriesForAdmin } from "@/lib/actions/categories";
import { getLocations } from "@/lib/actions/locations";
import { ProductsTable } from "./products-table";

export const metadata = {
  title: "إدارة المنتجات | منتجع فالي",
};

export default async function ProductsPage() {
  const [products, categories, locations] = await Promise.all([
    getProductsForAdmin({ includeInactive: true }),
    getCategoriesForAdmin(),
    getLocations(),
  ]);

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">إدارة المنتجات والتسعير</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          عرض، بحث، تعديل كامل (السعر، الباركود، الحد الأدنى، التصنيف)، وتعطيل آمن للأصناف.
        </p>
      </div>

      <ProductsTable
        initialProducts={products}
        categories={categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name, locationId: c.locationId }))}
        locations={locations}
      />
    </div>
  );
}
