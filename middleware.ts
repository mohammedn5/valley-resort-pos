import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

// خريطة المسار -> الصلاحية الدقيقة المطلوبة لفتحه. هذا يطبّق مبدأ الصلاحيات
// الديناميكية فعلياً على مستوى المسارات: أي دور يُمنح صلاحية معيّنة من مصفوفة
// الصلاحيات يستطيع فتح الشاشة المرتبطة بها مباشرة، بغض النظر عن كونه "مديراً"
// أو "كاشيراً" بالتصنيف التقليدي. الأكثر تحديداً يجب أن يسبق الأعم في الفحص.
const ROUTE_PERMISSIONS: { prefix: string; permission: string; exact?: boolean }[] = [
  { prefix: "/settings/roles", permission: "settings.manage_roles" },
  { prefix: "/settings/users", permission: "settings.manage_users" },
  { prefix: "/settings/locations", permission: "settings.manage_locations" },
  { prefix: "/settings/categories", permission: "inventory.manage_products" },
  { prefix: "/settings/suppliers", permission: "inventory.purchase" },
  { prefix: "/inventory/products", permission: "inventory.manage_products" },
  { prefix: "/inventory/adjustments", permission: "inventory.adjust_stock" },
  { prefix: "/inventory/transfer", permission: "inventory.transfer" },
  { prefix: "/inventory", permission: "inventory.view_stock", exact: true },
  { prefix: "/purchases", permission: "inventory.purchase" },
  { prefix: "/refunds", permission: "pos.refund" },
  { prefix: "/reports", permission: "reports.view" },
  { prefix: "/", permission: "reports.view", exact: true },
];

function findRequiredPermission(pathname: string): string | null {
  for (const route of ROUTE_PERMISSIONS) {
    const matches = route.exact ? pathname === route.prefix : pathname.startsWith(route.prefix);
    if (matches) return route.permission;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح بمرور الملفات الثابتة وواجهات API الداخلية دون فحص
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // مستخدم غير مسجل دخوله ويحاول فتح صفحة محمية -> إعادة توجيه لصفحة الدخول
  if (!session && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // مستخدم مسجل دخوله بالفعل ويحاول فتح صفحة الدخول -> إعادة توجيهه لمكانه الطبيعي
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (session) {
    // حماية مسار الكاشير: يتطلب صلاحية البيع
    if (pathname.startsWith("/pos") && !session.permissions.includes("pos.sell")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // حماية كل مسارات لوحة التحكم بصلاحيتها الدقيقة المطابقة من مصفوفة RBAC،
    // بدل تصنيف ثنائي "مدير/كاشير" - أي دور يملك الصلاحية المحددة يمر مباشرة
    if (!pathname.startsWith("/pos")) {
      const requiredPermission = findRequiredPermission(pathname);
      if (requiredPermission && !session.permissions.includes(requiredPermission)) {
        // المستخدم مسجّل دخوله لكن بلا صلاحية لهذه الشاشة تحديداً - نعيده لأقرب
        // مكان يملك صلاحية الوصول إليه فعلاً: نقطة بيعه الافتراضية إن وُجدت
        return NextResponse.redirect(new URL("/pos", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
