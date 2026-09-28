"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, requirePermission } from "@/lib/auth";

export type ActiveShift = {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  startTime: string;
};

export async function getActiveShift(locationId: string): Promise<ActiveShift | null> {
  const shift = await prisma.shift.findFirst({
    where: { locationId, status: "open" },
    include: { user: true },
    orderBy: { startTime: "desc" },
  });

  if (!shift) return null;

  return {
    id: shift.id,
    locationId: shift.locationId,
    userId: shift.userId,
    userName: shift.user.name,
    startTime: shift.startTime.toISOString(),
  };
}

export type OpenShiftResult =
  | { success: true; shift: ActiveShift }
  | { success: false; error: string };

export async function openShift(locationId: string): Promise<OpenShiftResult> {
  await requirePermission("pos.open_shift");

  const existing = await prisma.shift.findFirst({ where: { locationId, status: "open" } });
  if (existing) {
    return { success: false, error: "توجد وردية مفتوحة بالفعل لهذا المنفذ" };
  }

  const userId = await getCurrentUserId();

  const shift = await prisma.shift.create({
    data: { locationId, userId, status: "open" },
    include: { user: true },
  });

  revalidatePath(`/pos/${locationId}`);

  return {
    success: true,
    shift: {
      id: shift.id,
      locationId: shift.locationId,
      userId: shift.userId,
      userName: shift.user.name,
      startTime: shift.startTime.toISOString(),
    },
  };
}

export type CloseShiftInput = {
  shiftId: string;
  // صافي الكاش/الشبكة بعد خصم المرتجعات (تُحسب في الواجهة من مجموع Dexie
  // المحلي مطروحاً منه إجمالي مرتجعات نفس الوردية المجلوب من السيرفر)
  totalCash: number;
  totalCard: number;
  totalRefundCash: number;
  totalRefundCard: number;
  // النقد الفعلي الذي عدّه الكاشير يدوياً في الدرج عند الإغلاق (اختياري، قد
  // يُترك فارغاً إذا لم تُفعَّل خطوة الجرد النقدي)
  actualCashCounted: number | null;
  endTime: string;
};

export type CloseShiftResult = { success: true; cashDifference: number | null } | { success: false; error: string };

/**
 * يعتمد النظام هنا على الأرقام المُحسَبة من جهاز الكاشير (من قاعدة البيانات المحلية
 * Dexie) كمصدر الحقيقة الرسمي لإجمالي المبيعات، مطروحاً منها المرتجعات المسجَّلة
 * على مستوى السيرفر لنفس الوردية (getShiftRefundTotals) لضمان صافي دقيق. الدالة
 * Idempotent: استدعاؤها أكثر من مرة (كما يحدث عند إعادة محاولة المزامنة بعد
 * انقطاع) آمن تماماً - آخر استدعاء ناجح هو ما يُعتمد.
 */
export async function closeShiftOnServer(input: CloseShiftInput): Promise<CloseShiftResult> {
  await requirePermission("pos.close_shift");

  const shift = await prisma.shift.findUnique({ where: { id: input.shiftId } });

  if (!shift) {
    return { success: false, error: "الوردية غير موجودة على السيرفر" };
  }

  const cashDifference =
    input.actualCashCounted !== null ? input.actualCashCounted - input.totalCash : null;

  await prisma.shift.update({
    where: { id: input.shiftId },
    data: {
      status: "closed",
      endTime: new Date(input.endTime),
      totalCash: input.totalCash,
      totalCard: input.totalCard,
      totalRefundCash: input.totalRefundCash,
      totalRefundCard: input.totalRefundCard,
      actualCashCounted: input.actualCashCounted,
      cashDifference,
    },
  });

  revalidatePath(`/pos/${shift.locationId}`);
  revalidatePath("/reports");

  return { success: true, cashDifference };
}
