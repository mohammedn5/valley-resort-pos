"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type CategoryAdminRow = {
  id: string;
  name: string;
  isActive: boolean;
  locationId: string;
  locationName: string;
  productsCount: number;
};

export async function getCategoriesForAdmin(): Promise<CategoryAdminRow[]> {
  await requirePermission("inventory.manage_products");

  const categories = await prisma.category.findMany({
    include: { location: true, _count: { select: { products: true } } },
    orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.isActive,
    locationId: c.locationId,
    locationName: c.location.name,
    productsCount: c._count.products,
  }));
}

export type CategoryMutationResult = { success: true } | { success: false; error: string };

export async function createCategory(name: string, locationId: string): Promise<CategoryMutationResult> {
  await requirePermission("inventory.manage_products");

  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "اسم التصنيف مطلوب" };
  if (!locationId) return { success: false, error: "يجب اختيار الموقع" };

  const existing = await prisma.category.findFirst({ where: { name: trimmedName, locationId } });
  if (existing) return { success: false, error: "يوجد تصنيف بنفس الاسم في هذا الموقع مسبقاً" };

  await prisma.category.create({ data: { name: trimmedName, locationId, isActive: true } });

  revalidatePath("/settings/categories");
  revalidatePath("/inventory/products");
  return { success: true };
}

export async function updateCategoryName(categoryId: string, name: string): Promise<CategoryMutationResult> {
  await requirePermission("inventory.manage_products");

  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "اسم التصنيف مطلوب" };

  await prisma.category.update({ where: { id: categoryId }, data: { name: trimmedName } });

  revalidatePath("/settings/categories");
  revalidatePath("/inventory/products");
  return { success: true };
}

/**
 * تعطيل تصنيف يُخفي كل منتجاته تلقائياً من نتائج البحث في الكاشير والمشتريات
 * (searchProducts/searchProductsWithStock تُصفّي category.isActive:true)، دون
 * حذف أي بيانات أو كسر أي فاتورة سابقة.
 */
export async function toggleCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<CategoryMutationResult> {
  await requirePermission("inventory.manage_products");

  await prisma.category.update({ where: { id: categoryId }, data: { isActive } });

  revalidatePath("/settings/categories");
  revalidatePath("/inventory/products");
  return { success: true };
}
