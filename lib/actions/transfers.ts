"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, requirePermission } from "@/lib/auth";
import { createTransferSchema, type CreateTransferInput } from "@/lib/validations/transfer";
import { recordStockMovement } from "@/lib/stock-movement";

export type CreateTransferResult =
  | { success: true; transferId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

class InsufficientStockError extends Error {
  constructor(public productName: string, public available: number) {
    super(`الرصيد غير كافٍ للصنف "${productName}" (المتاح حالياً: ${available})`);
  }
}

export async function createStockTransfer(
  input: CreateTransferInput,
): Promise<CreateTransferResult> {
  await requirePermission("inventory.transfer");

  const parsed = createTransferSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "توجد بيانات غير صحيحة في نموذج التحويل",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const [fromLocation, toLocation] = await Promise.all([
    prisma.location.findUnique({ where: { id: data.fromLocationId } }),
    prisma.location.findUnique({ where: { id: data.toLocationId } }),
  ]);

  if (!fromLocation || !toLocation) {
    return { success: false, error: "أحد المواقع المختارة غير موجود" };
  }

  try {
    const currentUserId = await getCurrentUserId();
    const transferNumber = `TRF-${Date.now()}`;

    const transferId = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          createdById: currentUserId,
          status: "completed",
        },
      });

      for (const item of data.items) {
        // خصم ذري من المصدر: ينجح فقط إذا كان الرصيد كافياً في نفس اللحظة،
        // مما يمنع أي تعارض بيانات في حال تنفيذ عمليتين متزامنتين
        const deduction = await tx.inventoryStock.updateMany({
          where: {
            productId: item.productId,
            locationId: data.fromLocationId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        if (deduction.count === 0) {
          const currentStock = await tx.inventoryStock.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: data.fromLocationId,
              },
            },
          });

          throw new InsufficientStockError(
            item.productName,
            currentStock ? Number(currentStock.quantity) : 0,
          );
        }

        await recordStockMovement(tx, {
          productId: item.productId,
          locationId: data.fromLocationId,
          type: "transfer_out",
          quantityChange: -item.quantity,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          note: `تحويل صادر إلى ${toLocation.name} (${transferNumber})`,
          createdById: currentUserId,
        });

        await tx.inventoryStock.upsert({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: data.toLocationId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            productId: item.productId,
            locationId: data.toLocationId,
            quantity: item.quantity,
          },
        });

        await recordStockMovement(tx, {
          productId: item.productId,
          locationId: data.toLocationId,
          type: "transfer_in",
          quantityChange: item.quantity,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          note: `تحويل وارد من ${fromLocation.name} (${transferNumber})`,
          createdById: currentUserId,
        });

        await tx.transferItem.create({
          data: {
            stockTransferId: transfer.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      return transfer.id;
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/transfer");

    return { success: true, transferId };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: error.message };
    }

    console.error("فشل تنفيذ التحويل المخزني:", error);
    return { success: false, error: "حدث خطأ غير متوقع أثناء تنفيذ التحويل، حاول مرة أخرى" };
  }
}
