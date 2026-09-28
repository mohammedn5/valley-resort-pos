import { getCategoriesForAdmin } from "@/lib/actions/categories";
import { getLocations } from "@/lib/actions/locations";
import { CategoriesTable } from "./categories-table";

export const metadata = {
  title: "التصنيفات | منتجع فالي",
};

export default async function CategoriesSettingsPage() {
  const [categories, locations] = await Promise.all([getCategoriesForAdmin(), getLocations()]);

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تصنيفات الأصناف</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          كل تصنيف تابع لموقع واحد. تعطيل التصنيف يُخفي كل منتجاته من الكاشير والمشتريات فوراً.
        </p>
      </div>

      <CategoriesTable initialCategories={categories} locations={locations} />
    </div>
  );
}
