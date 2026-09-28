import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منتجع فالي | نظام إدارة المنتجع",
  description: "نظام ERP ونقاط بيع متكامل لمنتجع فالي",
};

// هذا تطبيق داخلي بالكامل (لا صفحات تسويقية أو محتوى عام) - كل صفحة تعتمد إما
// على الجلسة (cookies) أو استعلامات قاعدة بيانات حيّة أو كليهما. فرض العرض
// الديناميكي هنا مرة واحدة يمنع Next.js نهائياً من محاولة توليد أي صفحة حالية
// أو مستقبلية كصفحة ثابتة وقت البناء (Static Generation)، وهو ما كان يتسبب
// سابقاً في تنفيذ استعلامات Prisma فعلية أثناء `next build` نفسه (وليس وقت
// الطلب كما يجب) - هذا يفشل البناء بالكامل إن تعذّر الاتصال بقاعدة البيانات
// في تلك اللحظة، ويزيد استهلاك الذاكرة أثناء البناء بلا أي فائدة، لأن هذه
// الصفحات لن تُخدَّم كصفحات ثابتة على أي حال.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
