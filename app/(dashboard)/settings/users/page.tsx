import { getUsers, getRoleAndLocationOptions } from "@/lib/actions/users";
import { UsersTable } from "./users-table";

export const metadata = {
  title: "المستخدمون | منتجع فالي",
};

export default async function UsersSettingsPage() {
  const [users, options] = await Promise.all([getUsers(), getRoleAndLocationOptions()]);

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أنشئ مستخدمين جدد واربطهم بالأدوار والمنافذ المناسبة لهم.
        </p>
      </div>

      <UsersTable initialUsers={users} roles={options.roles} locations={options.locations} />
    </div>
  );
}
