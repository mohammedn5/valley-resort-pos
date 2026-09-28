/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // يُنتج .next/standalone: خادم Node.js مصغّر مع نسخة مُقلَّمة من node_modules
  // (فقط ما يُستخدم فعلياً وقت التشغيل عبر تتبع الاعتماديات)، بدل الاعتماد
  // على node_modules الكاملة - يقلّل حجم واستهلاك ذاكرة النشر بشكل كبير.
  output: "standalone",
  eslint: {
    // لا تمنع بناء الإنتاج بسبب تحذيرات/أخطاء ESLint - يبقى `npm run lint`
    // متاحاً يدوياً لمراجعة جودة الكود بشكل منفصل عن نشر الإنتاج
    ignoreDuringBuilds: true,
  },
  typescript: {
    // لا تمنع بناء الإنتاج بسبب أخطاء فحص الأنواع - يُنصح بتشغيل `tsc --noEmit`
    // يدوياً أو ضمن CI منفصل قبل كل نشر للتأكد من عدم إخفاء خطأ حقيقي
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
