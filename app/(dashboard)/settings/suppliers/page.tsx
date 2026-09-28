import { getSuppliersForAdmin } from "@/lib/actions/suppliers";
import { SuppliersTable } from "./suppliers-table";

export const metadata = {
  title: "الموردون | منتجع فالي",
};

export default async function SuppliersSettingsPage() {
  const suppliers = await getSuppliersForAdmin();

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الموردون</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          يُنشأ المورد تلقائياً عند كتابة اسمه لأول مرة في فاتورة مشتريات، ويمكنك هنا تعديل بياناته أو تعطيله.
        </p>
      </div>

      <SuppliersTable initialSuppliers={suppliers} />
    </div>
  );
}
