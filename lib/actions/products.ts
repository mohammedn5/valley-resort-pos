"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type ProductSearchResult = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
};

export type ProductWithStockResult = ProductSearchResult & {
  availableQuantity: number;
};

/**
 * بحث عام عن المنتجات النشطة (وفي تصنيف مفعّل) بالاسم أو الباركود، بغض النظر
 * عن الموقع. يُستخدم في شاشة إضافة فاتورة المشتريات.
 */
export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  const trimmed = query.trim();

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: { isActive: true },
      ...(trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { barcode: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 15,
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    price: Number(p.price),
  }));
}

/**
 * بحث عن المنتجات المتوفرة برصيد فعلي (> 0) داخل موقع محدد.
 * يُستخدم في شاشة التحويل المخزني للتأكد من عدم اختيار صنف غير متوفر بالمصدر.
 */
export async function searchProductsWithStock(
  query: string,
  locationId: string,
): Promise<ProductWithStockResult[]> {
  const trimmed = query.trim();

  const stocks = await prisma.inventoryStock.findMany({
    where: {
      locationId,
      quantity: { gt: 0 },
      product: {
        isActive: true,
        category: { isActive: true },
        ...(trimmed
          ? {
              OR: [
                { name: { contains: trimmed, mode: "insensitive" } },
                { barcode: { contains: trimmed, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: { product: true },
    orderBy: { product: { name: "asc" } },
    take: 15,
  });

  return stocks.map((stock) => ({
    id: stock.product.id,
    name: stock.product.name,
    barcode: stock.product.barcode,
    price: Number(stock.product.price),
    availableQuantity: Number(stock.quantity),
  }));
}

// ================================================================
// إدارة المنتجات الكاملة (عرض / إنشاء / تعديل / تعطيل) - لوحة التحكم
// ================================================================

export type ProductAdminRow = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  costPrice: number | null;
  minStockLevel: number | null;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  locationId: string;
  locationName: string;
};

export type ProductFilters = {
  locationId?: string;
  categoryId?: string;
  search?: string;
  includeInactive?: boolean;
};

export async function getProductsForAdmin(filters: ProductFilters = {}): Promise<ProductAdminRow[]> {
  await requirePermission("inventory.manage_products");

  const trimmedSearch = filters.search?.trim();

  const products = await prisma.product.findMany({
    where: {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.locationId ? { category: { locationId: filters.locationId } } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              { name: { contains: trimmedSearch, mode: "insensitive" } },
              { barcode: { contains: trimmedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: { include: { location: true } } },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    price: Number(p.price),
    costPrice: p.costPrice ? Number(p.costPrice) : null,
    minStockLevel: p.minStockLevel,
    isActive: p.isActive,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    locationId: p.category.locationId,
    locationName: p.category.location.name,
  }));
}

export type ProductMutationResult = { success: true } | { success: false; error: string };

export type CreateProductInput = {
  name: string;
  categoryId: string;
  barcode: string | null;
  price: number;
  costPrice: number | null;
  minStockLevel: number | null;
};

export async function createProduct(input: CreateProductInput): Promise<ProductMutationResult> {
  await requirePermission("inventory.manage_products");

  const name = input.name.trim();
  if (!name) return { success: false, error: "اسم الصنف مطلوب" };
  if (!input.categoryId) return { success: false, error: "يجب اختيار التصنيف" };
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { success: false, error: "سعر البيع غير صالح" };
  }

  const barcode = input.barcode?.trim() || null;
  if (barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
    if (existingBarcode) return { success: false, error: "الباركود مستخدم مسبقاً لصنف آخر" };
  }

  await prisma.product.create({
    data: {
      name,
      categoryId: input.categoryId,
      barcode,
      price: input.price,
      costPrice: input.costPrice,
      minStockLevel: input.minStockLevel,
      isActive: true,
    },
  });

  revalidatePath("/inventory/products");
  return { success: true };
}

export type UpdateProductInput = CreateProductInput;

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<ProductMutationResult> {
  await requirePermission("inventory.manage_products");

  const name = input.name.trim();
  if (!name) return { success: false, error: "اسم الصنف مطلوب" };
  if (!input.categoryId) return { success: false, error: "يجب اختيار التصنيف" };
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { success: false, error: "سعر البيع غير صالح" };
  }

  const barcode = input.barcode?.trim() || null;
  if (barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { barcode, id: { not: productId } },
    });
    if (existingBarcode) return { success: false, error: "الباركود مستخدم مسبقاً لصنف آخر" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      categoryId: input.categoryId,
      barcode,
      price: input.price,
      costPrice: input.costPrice,
      minStockLevel: input.minStockLevel,
    },
  });

  revalidatePath("/inventory/products");
  return { success: true };
}

/**
 * تعطيل/تفعيل بدل الحذف الفعلي (Soft Delete): الصنف المعطَّل يختفي فوراً من
 * كل قوائم البحث والكاشير (searchProducts تُصفّي isActive:true)، لكن يبقى
 * مرتبطاً بكل فواتير المبيعات والمشتريات القديمة دون كسرها.
 */
export async function toggleProductActive(
  productId: string,
  isActive: boolean,
): Promise<ProductMutationResult> {
  await requirePermission("inventory.manage_products");

  await prisma.product.update({ where: { id: productId }, data: { isActive } });

  revalidatePath("/inventory/products");
  return { success: true };
}

// ================================================================
// سجل حركة الصنف (Item Movement History / Ledger)
// ================================================================

export type StockMovementRow = {
  id: string;
  type: string;
  quantityChange: number;
  balanceAfter: number;
  locationName: string;
  note: string | null;
  createdByName: string;
  createdAt: string;
};

export async function getProductLedger(
  productId: string,
  locationId?: string,
): Promise<StockMovementRow[]> {
  await requirePermission("inventory.view_stock");

  const movements = await prisma.stockMovement.findMany({
    where: {
      productId,
      ...(locationId ? { locationId } : {}),
    },
    include: { location: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantityChange: Number(m.quantityChange),
    balanceAfter: Number(m.balanceAfter),
    locationName: m.location.name,
    note: m.note,
    createdByName: m.createdBy.name,
    createdAt: m.createdAt.toISOString(),
  }));
}
