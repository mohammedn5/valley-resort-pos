"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  Package,
  ArrowLeftRight,
  AlertTriangle,
  Undo2,
  BarChart3,
  Users,
  Store,
  Tags,
  Truck,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/purchases", label: "المشتريات", icon: ShoppingCart },
  { href: "/inventory", label: "المخزون (نظرة عامة)", icon: Warehouse, exact: true },
  { href: "/inventory/products", label: "المنتجات والتسعير", icon: Package },
  { href: "/inventory/transfer", label: "التحويل المخزني", icon: ArrowLeftRight },
  { href: "/inventory/adjustments", label: "التالف والتسويات", icon: AlertTriangle },
  { href: "/refunds", label: "المرتجعات", icon: Undo2 },
  { href: "/reports", label: "تقارير المبيعات", icon: BarChart3 },
  { href: "/settings/categories", label: "التصنيفات", icon: Tags },
  { href: "/settings/suppliers", label: "الموردون", icon: Truck },
  { href: "/settings/roles", label: "الأدوار والصلاحيات", icon: Users },
  { href: "/settings/users", label: "المستخدمون", icon: Users },
  { href: "/settings/locations", label: "المواقع والمنافذ", icon: Store },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-l bg-white">
      <div className="border-b p-4">
        <h1 className="text-lg font-bold">منتجع فالي</h1>
        <p className="text-xs text-muted-foreground">لوحة التحكم الإدارية</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t p-3">
        <a
          href="/pos"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <Store className="h-4 w-4" />
          الانتقال لنقاط البيع
        </a>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </aside>
  );
}
