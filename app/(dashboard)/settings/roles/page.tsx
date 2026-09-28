import { getPermissionMatrix } from "@/lib/actions/roles";
import { PermissionsMatrix } from "./permissions-matrix";

export const metadata = {
  title: "الأدوار والصلاحيات | منتجع فالي",
};

export default async function RolesSettingsPage() {
  const matrix = await getPermissionMatrix();

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الأدوار ومصفوفة الصلاحيات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          فعّل أو ألغِ أي صلاحية لأي دور مباشرة - يتم الحفظ فوراً دون الحاجة لزر حفظ منفصل.
        </p>
      </div>

      <PermissionsMatrix matrix={matrix} />
    </div>
  );
}
