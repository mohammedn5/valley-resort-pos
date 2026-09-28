"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type UserListItem = {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
};

export async function getUsers(): Promise<UserListItem[]> {
  await requirePermission("settings.manage_users");

  const users = await prisma.user.findMany({
    include: { role: true, location: true },
    orderBy: { name: "asc" },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    isActive: user.isActive,
    roleId: user.roleId,
    roleName: user.role.name,
    locationId: user.locationId,
    locationName: user.location?.name ?? null,
  }));
}

export type RoleOption = { id: string; name: string };
export type LocationOption = { id: string; name: string };

export async function getRoleAndLocationOptions(): Promise<{
  roles: RoleOption[];
  locations: LocationOption[];
}> {
  await requirePermission("settings.manage_users");

  const [roles, locations] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return {
    roles: roles.map((r) => ({ id: r.id, name: r.name })),
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
  };
}

export type CreateUserInput = {
  name: string;
  username: string;
  password: string;
  roleId: string;
  locationId: string | null;
};

export type MutationResult = { success: true } | { success: false; error: string };

export async function createUser(input: CreateUserInput): Promise<MutationResult> {
  await requirePermission("settings.manage_users");

  const username = input.username.trim();
  const name = input.name.trim();

  if (!name || !username || !input.password || !input.roleId) {
    return { success: false, error: "جميع الحقول المطلوبة يجب تعبئتها" };
  }

  if (input.password.length < 6) {
    return { success: false, error: "كلمة المرور يجب ألا تقل عن 6 أحرف" };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { success: false, error: "اسم المستخدم مستخدم مسبقاً" };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      roleId: input.roleId,
      locationId: input.locationId,
      isActive: true,
    },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

export async function updateUserRole(userId: string, roleId: string): Promise<MutationResult> {
  await requirePermission("settings.manage_users");
  await prisma.user.update({ where: { id: userId }, data: { roleId } });
  revalidatePath("/settings/users");
  return { success: true };
}

export async function updateUserLocation(userId: string, locationId: string | null): Promise<MutationResult> {
  await requirePermission("settings.manage_users");
  await prisma.user.update({ where: { id: userId }, data: { locationId } });
  revalidatePath("/settings/users");
  return { success: true };
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<MutationResult> {
  await requirePermission("settings.manage_users");
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/settings/users");
  return { success: true };
}
