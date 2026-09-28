// ============================================================
// نظام ERP / POS متعدد المنافذ - منتجع فالي
// المرحلة 1: Database Seeder
// تشغيل: npx prisma db seed
// ============================================================

import { PrismaClient, LocationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 بدء تعبئة قاعدة البيانات ببيانات منتجع فالي...");

  // ----------------------------------------------------------
  // 1. المواقع (المستودع + منافذ البيع)
  // ----------------------------------------------------------

  const warehouse = await prisma.location.upsert({
    where: { id: "loc-warehouse" },
    update: {},
    create: {
      id: "loc-warehouse",
      name: "المستودع الرئيسي",
      type: LocationType.warehouse,
    },
  });

  const cafe = await prisma.location.upsert({
    where: { id: "loc-cafe" },
    update: {},
    create: { id: "loc-cafe", name: "كافيه فالي", type: LocationType.pos },
  });

  const restaurant = await prisma.location.upsert({
    where: { id: "loc-restaurant" },
    update: {},
    create: {
      id: "loc-restaurant",
      name: "مطعم المنتجع",
      type: LocationType.pos,
    },
  });

  const gate = await prisma.location.upsert({
    where: { id: "loc-gate" },
    update: {},
    create: {
      id: "loc-gate",
      name: "بوابة الدخول والتذاكر",
      type: LocationType.pos,
    },
  });

  const arcade = await prisma.location.upsert({
    where: { id: "loc-arcade" },
    update: {},
    create: { id: "loc-arcade", name: "محل الألعاب", type: LocationType.pos },
  });

  console.log("✅ تم إنشاء المواقع الخمسة");

  // ----------------------------------------------------------
  // 2. الصلاحيات (Permissions) - مقسمة على موديولات
  // ----------------------------------------------------------

  const permissionsData = [
    // POS
    { key: "pos.sell", name: "إنشاء فاتورة بيع", module: "POS" },
    { key: "pos.refund", name: "استرجاع فاتورة", module: "POS" },
    { key: "pos.open_shift", name: "فتح وردية", module: "POS" },
    { key: "pos.close_shift", name: "إغلاق وردية", module: "POS" },
    { key: "pos.view_z_report", name: "عرض تقرير الإغلاق (Z-Report)", module: "POS" },
    // Warehouse
    { key: "inventory.purchase", name: "تسجيل عملية شراء/توريد", module: "Warehouse" },
    { key: "inventory.transfer", name: "تحويل مخزني بين المواقع", module: "Warehouse" },
    { key: "inventory.view_stock", name: "عرض أرصدة المخزون", module: "Warehouse" },
    { key: "inventory.manage_products", name: "إدارة المنتجات والتصنيفات", module: "Warehouse" },
    { key: "inventory.adjust_stock", name: "تسجيل تالف وهدر وتسويات المخزون", module: "Warehouse" },
    // Reports
    { key: "reports.view", name: "عرض التقارير العامة", module: "Reports" },
    { key: "reports.export", name: "تصدير التقارير", module: "Reports" },
    // Settings
    { key: "settings.manage_users", name: "إدارة المستخدمين", module: "Settings" },
    { key: "settings.manage_roles", name: "إدارة الأدوار والصلاحيات", module: "Settings" },
    { key: "settings.manage_locations", name: "إدارة المواقع والمنافذ", module: "Settings" },
  ];

  const permissions = [];
  for (const p of permissionsData) {
    const permission = await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
    permissions.push(permission);
  }

  console.log(`✅ تم إنشاء ${permissions.length} صلاحية`);

  // ----------------------------------------------------------
  // 3. الأدوار (Roles) وربطها بالصلاحيات
  // ----------------------------------------------------------

  const adminRole = await prisma.role.upsert({
    where: { name: "مدير النظام" },
    update: {},
    create: { name: "مدير النظام", description: "صلاحية كاملة على كافة أجزاء النظام" },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: "كاشير" },
    update: {},
    create: { name: "كاشير", description: "صلاحيات نقاط البيع فقط" },
  });

  // المدير يحصل على كل الصلاحيات
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  // الكاشير يحصل فقط على صلاحيات POS الأساسية
  const cashierPermissionKeys = ["pos.sell", "pos.open_shift", "pos.close_shift"];
  for (const key of cashierPermissionKeys) {
    const permission = permissions.find((p) => p.key === key)!;
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: cashierRole.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: cashierRole.id, permissionId: permission.id },
    });
  }

  console.log("✅ تم إنشاء الأدوار وربطها بالصلاحيات");

  // ----------------------------------------------------------
  // 4. المستخدمون التجريبيون
  // ----------------------------------------------------------

  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const cashierPasswordHash = await bcrypt.hash("Cashier@123", 10);

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "مدير المنتجع",
      username: "admin",
      passwordHash: adminPasswordHash,
      isActive: true,
      roleId: adminRole.id,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { username: "cashier1" },
    update: {},
    create: {
      name: "كاشير تجريبي - كافيه فالي",
      username: "cashier1",
      passwordHash: cashierPasswordHash,
      isActive: true,
      roleId: cashierRole.id,
      locationId: cafe.id,
    },
  });

  console.log("✅ تم إنشاء المستخدمين (admin / cashier1)");

  // ----------------------------------------------------------
  // 5. التصنيفات والمنتجات لكل منفذ بيع
  // ----------------------------------------------------------

  type SeedProduct = { name: string; price: number };
  type SeedCategory = { name: string; locationId: string; products: SeedProduct[] };

  const categoriesSeed: SeedCategory[] = [
    {
      name: "المشروبات والحلويات",
      locationId: cafe.id,
      products: [
        { name: "سبانش لاتيه", price: 22 },
        { name: "فلات وايت", price: 20 },
        { name: "قهوة اليوم", price: 15 },
        { name: "كوكيز", price: 12 },
        { name: "تشيز كيك", price: 25 },
      ],
    },
    {
      name: "الوجبات الرئيسية",
      locationId: restaurant.id,
      products: [
        { name: "برجر لحم", price: 45 },
        { name: "برجر دجاج", price: 38 },
        { name: "فرايز", price: 15 },
        { name: "بيبسي", price: 8 },
      ],
    },
    {
      name: "تذاكر الدخول",
      locationId: gate.id,
      products: [
        { name: "تذكرة دخول كبار", price: 100 },
        { name: "تذكرة دخول أطفال", price: 50 },
      ],
    },
    {
      name: "بطاقات الشحن",
      locationId: arcade.id,
      products: [
        { name: "بطاقة شحن ألعاب 50", price: 50 },
        { name: "بطاقة شحن ألعاب 100", price: 100 },
      ],
    },
  ];

  // خطة أرصدة ابتدائية للمستودع الرئيسي (تحسباً لأي توريد مستقبلي أو تحويل عكسي)
  const WAREHOUSE_INITIAL_QTY = 200;
  const POS_INITIAL_QTY = 50;

  for (const cat of categoriesSeed) {
    // لا يوجد قيد Unique مركب على (name, locationId) في المخطط، لذلك نتحقق
    // من وجود التصنيف يدوياً قبل الإنشاء لضمان أن تشغيل الـ Seed أكثر من مرة آمن (Idempotent)
    let category = await prisma.category.findFirst({
      where: { name: cat.name, locationId: cat.locationId },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, locationId: cat.locationId },
      });
    }

    for (const prod of cat.products) {
      let product = await prisma.product.findFirst({
        where: { name: prod.name, categoryId: category.id },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: prod.name,
            price: prod.price,
            categoryId: category.id,
            isActive: true,
          },
        });
      }

      // رصيد ابتدائي في منفذ البيع
      await prisma.inventoryStock.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: cat.locationId,
          },
        },
        update: {},
        create: {
          productId: product.id,
          locationId: cat.locationId,
          quantity: POS_INITIAL_QTY,
        },
      });

      // رصيد ابتدائي في المستودع الرئيسي لنفس المنتج
      await prisma.inventoryStock.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: warehouse.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          locationId: warehouse.id,
          quantity: WAREHOUSE_INITIAL_QTY,
        },
      });
    }
  }

  console.log("✅ تم إنشاء التصنيفات والمنتجات وأرصدة المخزون الابتدائية");

  console.log("🎉 اكتملت تعبئة قاعدة البيانات بنجاح.");
  console.log("--------------------------------------------------");
  console.log("بيانات الدخول التجريبية:");
  console.log(`  مدير:   username=admin     password=Admin@123`);
  console.log(`  كاشير:  username=cashier1  password=Cashier@123`);
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ حدث خطأ أثناء التعبئة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
