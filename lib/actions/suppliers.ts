"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type SupplierAdminRow = {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  purchasesCount: number;
};

export async function getSuppliersForAdmin(): Promise<SupplierAdminRow[]> {
  await requirePermission("inventory.purchase");

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: "asc" },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    isActive: s.isActive,
    purchasesCount: s._count.purchases,
  }));
}

export type SupplierMutationResult = { success: true } | { success: false; error: string };

export async function createSupplier(name: string, phone: string): Promise<SupplierMutationResult> {
  await requirePermission("inventory.purchase");

  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "اسم المورد مطلوب" };

  const existing = await prisma.supplier.findFirst({
    where: { name: { equals: trimmedName, mode: "insensitive" } },
  });
  if (existing) return { success: false, error: "يوجد مورد بنفس الاسم مسبقاً" };

  await prisma.supplier.create({
    data: { name: trimmedName, phone: phone.trim() || null, isActive: true },
  });

  revalidatePath("/settings/suppliers");
  return { success: true };
}

export async function updateSupplier(
  supplierId: string,
  name: string,
  phone: string,
): Promise<SupplierMutationResult> {
  await requirePermission("inventory.purchase");

  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "اسم المورد مطلوب" };

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { name: trimmedName, phone: phone.trim() || null },
  });

  revalidatePath("/settings/suppliers");
  return { success: true };
}

export async function toggleSupplierActive(
  supplierId: string,
  isActive: boolean,
): Promise<SupplierMutationResult> {
  await requirePermission("inventory.purchase");

  await prisma.supplier.update({ where: { id: supplierId }, data: { isActive } });

  revalidatePath("/settings/suppliers");
  return { success: true };
}
