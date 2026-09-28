"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type PermissionMatrixData = {
  roles: { id: string; name: string; description: string | null }[];
  modules: {
    module: string;
    permissions: { id: string; key: string; name: string }[];
  }[];
  // خريطة سريعة: `${roleId}:${permissionId}` -> مفعّلة أم لا
  assignments: Record<string, boolean>;
};

export async function getPermissionMatrix(): Promise<PermissionMatrixData> {
  await requirePermission("settings.manage_roles");

  const [roles, permissions, rolePermissions] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.permission.findMany({ orderBy: [{ module: "asc" }, { name: "asc" }] }),
    prisma.rolePermission.findMany(),
  ]);

  const moduleOrder = ["POS", "Warehouse", "Reports", "Settings"];
  const modules = moduleOrder
    .map((module) => ({
      module,
      permissions: permissions
        .filter((permission) => permission.module === module)
        .map((permission) => ({ id: permission.id, key: permission.key, name: permission.name })),
    }))
    .filter((group) => group.permissions.length > 0);

  const assignments: Record<string, boolean> = {};
  for (const rolePermission of rolePermissions) {
    assignments[`${rolePermission.roleId}:${rolePermission.permissionId}`] = true;
  }

  return {
    roles: roles.map((role) => ({ id: role.id, name: role.name, description: role.description })),
    modules,
    assignments,
  };
}

export type ToggleResult = { success: true } | { success: false; error: string };

export async function togglePermission(
  roleId: string,
  permissionId: string,
  enabled: boolean,
): Promise<ToggleResult> {
  await requirePermission("settings.manage_roles");

  try {
    if (enabled) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    } else {
      await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
    }

    revalidatePath("/settings/roles");
    return { success: true };
  } catch (error) {
    console.error("فشل تحديث الصلاحية:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث الصلاحية" };
  }
}

export type CreateRoleResult = { success: true; roleId: string } | { success: false; error: string };

export async function createRole(name: string, description: string): Promise<CreateRoleResult> {
  await requirePermission("settings.manage_roles");

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "اسم الدور مطلوب" };
  }

  const existing = await prisma.role.findUnique({ where: { name: trimmedName } });
  if (existing) {
    return { success: false, error: "يوجد دور بنفس الاسم مسبقاً" };
  }

  const role = await prisma.role.create({
    data: { name: trimmedName, description: description.trim() || null },
  });

  revalidatePath("/settings/roles");
  return { success: true, roleId: role.id };
}
