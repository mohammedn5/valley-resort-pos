"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/session";

export type LoginResult = { success: true; redirectTo: string } | { success: false; error: string };

// صلاحيات تُعتبر مؤشراً على أن المستخدم "إداري" ويجب توجيهه للوحة التحكم بدل الكاشير
const ADMIN_INDICATOR_PERMISSIONS = ["reports.view", "settings.manage_users", "settings.manage_roles"];

export async function loginAction(username: string, password: string): Promise<LoginResult> {
  const trimmedUsername = username.trim();

  if (!trimmedUsername || !password) {
    return { success: false, error: "الرجاء إدخال اسم المستخدم وكلمة المرور" };
  }

  const user = await prisma.user.findUnique({
    where: { username: trimmedUsername },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!user || !user.isActive) {
    return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }

  const permissions = user.role.permissions.map((rolePermission) => rolePermission.permission.key);

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions,
  });

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  const isAdmin = permissions.some((key) => ADMIN_INDICATOR_PERMISSIONS.includes(key));
  if (isAdmin) {
    return { success: true, redirectTo: "/" };
  }

  if (user.locationId) {
    return { success: true, redirectTo: `/pos/${user.locationId}` };
  }

  const firstPosLocation = await prisma.location.findFirst({
    where: { type: "pos" },
    orderBy: { name: "asc" },
  });

  return { success: true, redirectTo: firstPosLocation ? `/pos/${firstPosLocation.id}` : "/" };
}

export async function logoutAction(): Promise<void> {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
