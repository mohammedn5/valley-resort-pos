"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type LocationOption = {
  id: string;
  name: string;
  type: "warehouse" | "pos";
};

export type LocationAdminRow = LocationOption & {
  isActive: boolean;
};

/**
 * يعيد المواقع "المفعّلة فقط". تُستخدم في كل القوائم التشغيلية (وجهة الشراء،
 * مصدر/وجهة التحويل، فهرس نقاط البيع...) حتى لا يظهر منفذ تم تعطيله كخيار
 * قابل للاستخدام في أي عملية جديدة.
 */
export async function getLocations(): Promise<LocationOption[]> {
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    type: location.type,
  }));
}

/**
 * يعيد كل المواقع (المفعّلة والمعطّلة معاً) - تُستخدم حصراً في شاشة إدارة
 * المواقع بلوحة التحكم، حيث يحتاج المدير رؤية المعطّل أيضاً لإعادة تفعيله.
 */
export async function getAllLocationsForAdmin(): Promise<LocationAdminRow[]> {
  await requirePermission("settings.manage_locations");

  const locations = await prisma.location.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    type: location.type,
    isActive: location.isActive,
  }));
}

export type MutationResult = { success: true } | { success: false; error: string };

export async function createLocation(
  name: string,
  type: "warehouse" | "pos",
): Promise<MutationResult> {
  await requirePermission("settings.manage_locations");

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "اسم الموقع مطلوب" };
  }

  const existing = await prisma.location.findFirst({ where: { name: trimmedName } });
  if (existing) {
    return { success: false, error: "يوجد موقع بنفس الاسم مسبقاً" };
  }

  await prisma.location.create({ data: { name: trimmedName, type, isActive: true } });

  // يجب إبطال ذاكرة الصفحات التي تعرض قوائم المواقع فوراً حتى يظهر المنفذ
  // الجديد مباشرة في شاشات المشتريات والتحويل وفهرس نقاط البيع
  revalidatePath("/settings/locations");
  revalidatePath("/purchases/new");
  revalidatePath("/inventory/transfer");
  revalidatePath("/pos");

  return { success: true };
}

export async function toggleLocationActive(
  locationId: string,
  isActive: boolean,
): Promise<MutationResult> {
  await requirePermission("settings.manage_locations");

  await prisma.location.update({ where: { id: locationId }, data: { isActive } });

  revalidatePath("/settings/locations");
  revalidatePath("/purchases/new");
  revalidatePath("/inventory/transfer");
  revalidatePath("/pos");

  return { success: true };
}
