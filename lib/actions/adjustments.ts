"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, requirePermission } from "@/lib/auth";
import { recordStockMovement } from "@/lib/stock-movement";
import {
  ADJUSTMENT_REASON_LABELS,
  getAdjustmentReasonLabel,
  type AdjustmentReasonKey,
} from "@/lib/utils/adjustments";

export type { AdjustmentReasonKey } from "@/lib/utils/adjustments";

export type CreateAdjustmentInput = {
  productId: string;
  locationId: string;
  quantity: number; // دائماً رقم موجب يمثل المقدار المتأثر
  direction: "decrease" | "increase"; // نقص (تالف/هدر/فقدان) أو زيادة (عُثر عليه/تصحيح جرد)
  reason: AdjustmentReasonKey;
  reasonNote: string;
};

export type AdjustmentMutationResult = { success: true } | { success: false; error: string };

class InsufficientStockForAdjustmentError extends Error {}

export async function createAdjustment(input: CreateAdjustmentInput): Promise<AdjustmentMutationResult> {
  await requirePermission("inventory.adjust_stock");

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { success: false, error: "الكمية يجب أن تكون رقماً أكبر من صفر" };
  }
  if (!input.productId || !input.locationId) {
    return { success: false, error: "يجب اختيار الصنف والموقع" };
  }
  if (!(input.reason in ADJUSTMENT_REASON_LABELS)) {
    return { success: false, error: "سبب التسوية غير صالح" };
  }

  const quantityChange = input.direction === "decrease" ? -input.quantity : input.quantity;

  try {
    const currentUserId = await getCurrentUserId();

    await prisma.$transaction(async (tx) => {
      if (input.direction === "decrease") {
        // خصم ذري: يمنع تسجيل تالف بكمية أكبر من الرصيد الفعلي المتوفر
        const deduction = await tx.inventoryStock.updateMany({
          where: {
            productId: input.productId,
            locationId: input.locationId,
            quantity: { gte: input.quantity },
          },
          data: { quantity: { decrement: input.quantity } },
        });

        if (deduction.count === 0) {
          const currentStock = await tx.inventoryStock.findUnique({
            where: {
              productId_locationId: { productId: input.productId, locationId: input.locationId },
            },
          });
          throw new InsufficientStockForAdjustmentError(
            `الرصيد المتوفر (${currentStock ? Number(currentStock.quantity) : 0}) أقل من الكمية المطلوب خصمها (${input.quantity})`,
          );
        }
      } else {
        await tx.inventoryStock.upsert({
          where: {
            productId_locationId: { productId: input.productId, locationId: input.locationId },
          },
          update: { quantity: { increment: input.quantity } },
          create: {
            productId: input.productId,
            locationId: input.locationId,
            quantity: input.quantity,
          },
        });
      }

      await tx.inventoryAdjustment.create({
        data: {
          productId: input.productId,
          locationId: input.locationId,
          quantityChange,
          reason: input.reason,
          reasonNote: input.reasonNote.trim() || null,
          createdById: currentUserId,
        },
      });

      await recordStockMovement(tx, {
        productId: input.productId,
        locationId: input.locationId,
        type: "adjustment",
        quantityChange,
        referenceType: "InventoryAdjustment",
        note: `${getAdjustmentReasonLabel(input.reason)}${input.reasonNote ? ` - ${input.reasonNote}` : ""}`,
        createdById: currentUserId,
      });
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/adjustments");

    return { success: true };
  } catch (error) {
    if (error instanceof InsufficientStockForAdjustmentError) {
      return { success: false, error: error.message };
    }
    console.error("فشل تسجيل التسوية المخزنية:", error);
    return { success: false, error: "حدث خطأ غير متوقع أثناء تسجيل التسوية" };
  }
}

export type AdjustmentListRow = {
  id: string;
  productName: string;
  locationName: string;
  quantityChange: number;
  reason: string;
  reasonLabel: string;
  reasonNote: string | null;
  createdByName: string;
  createdAt: string;
};

export async function getAdjustments(): Promise<AdjustmentListRow[]> {
  await requirePermission("inventory.adjust_stock");

  const adjustments = await prisma.inventoryAdjustment.findMany({
    include: { product: true, location: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return adjustments.map((a) => ({
    id: a.id,
    productName: a.product.name,
    locationName: a.location.name,
    quantityChange: Number(a.quantityChange),
    reason: a.reason,
    reasonLabel: getAdjustmentReasonLabel(a.reason),
    reasonNote: a.reasonNote,
    createdByName: a.createdBy.name,
    createdAt: a.createdAt.toISOString(),
  }));
}
