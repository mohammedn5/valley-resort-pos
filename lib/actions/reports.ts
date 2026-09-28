"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type ShiftHistoryRow = {
  id: string;
  locationName: string;
  cashierName: string;
  startTime: string;
  endTime: string | null;
  totalCash: number;
  totalCard: number;
  totalRefundCash: number;
  totalRefundCard: number;
  totalAmount: number;
  ordersCount: number;
  actualCashCounted: number | null;
  cashDifference: number | null;
};

export async function getShiftsHistory(): Promise<ShiftHistoryRow[]> {
  await requirePermission("reports.view");

  const shifts = await prisma.shift.findMany({
    where: { status: "closed" },
    include: { location: true, user: true, orders: { select: { id: true } } },
    orderBy: { endTime: "desc" },
    take: 50,
  });

  return shifts.map((shift) => ({
    id: shift.id,
    locationName: shift.location.name,
    cashierName: shift.user.name,
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime ? shift.endTime.toISOString() : null,
    totalCash: Number(shift.totalCash),
    totalCard: Number(shift.totalCard),
    totalRefundCash: Number(shift.totalRefundCash),
    totalRefundCard: Number(shift.totalRefundCard),
    totalAmount: Number(shift.totalCash) + Number(shift.totalCard),
    ordersCount: shift.orders.length,
    actualCashCounted: shift.actualCashCounted !== null ? Number(shift.actualCashCounted) : null,
    cashDifference: shift.cashDifference !== null ? Number(shift.cashDifference) : null,
  }));
}
