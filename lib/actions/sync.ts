"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncOrderSchema, type SyncOrderInput } from "@/lib/validations/order";
import { recordStockMovement } from "@/lib/stock-movement";

export type SyncOrderResult = {
  localOrderId: string;
  status: "synced" | "already_synced" | "failed";
  error?: string;
};

export type SyncLocalOrdersResponse = { results: SyncOrderResult[] };

/**
 * يستقبل دفعة من الفواتير المحلية (Pending) ويحاول ترحيلها للسيرفر واحدة تلو الأخرى.
 * كل فاتورة مستقلة عن الأخرى: فشل فاتورة واحدة لا يوقف مزامنة البقية.
 * الاعتماد على `localOrderId` (فريد في قاعدة البيانات) يمنع إنشاء الفاتورة مرتين
 * حتى لو أعاد الجهاز إرسالها بعد انقطاع أثناء المزامنة السابقة.
 */
export async function syncLocalOrders(orders: SyncOrderInput[]): Promise<SyncLocalOrdersResponse> {
  const results: SyncOrderResult[] = [];

  for (const rawOrder of orders) {
    const parsed = syncOrderSchema.safeParse(rawOrder);

    if (!parsed.success) {
      results.push({
        localOrderId: (rawOrder as { localOrderId?: string }).localOrderId ?? "unknown",
        status: "failed",
        error: "بيانات الفاتورة المحلية غير صالحة",
      });
      continue;
    }

    const order = parsed.data;

    const existing = await prisma.order.findUnique({
      where: { localOrderId: order.localOrderId },
      select: { id: true },
    });

    if (existing) {
      results.push({ localOrderId: order.localOrderId, status: "already_synced" });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            localOrderId: order.localOrderId,
            locationId: order.locationId,
            userId: order.userId,
            shiftId: order.shiftId,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            cashAmount: order.cashAmount,
            cardAmount: order.cardAmount,
            isSynced: true,
            createdAt: new Date(order.createdAt),
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              })),
            },
          },
        });

        // خصم المخزون من منفذ البيع لحظة تأكد وصول الفاتورة للسيرفر.
        // ملاحظة: في حال بيع آخر قطعة من صنف على جهازين أوفلاين في نفس اللحظة قبل
        // المزامنة، قد ينتج رصيد سالب مؤقت هنا؛ هذا تنازل معماري متعمّد لصالح عدم
        // رفض فاتورة مدفوعة بالفعل للعميل، ويجب أن يظهر كتنبيه لمراجعة المخزون لاحقاً.
        for (const item of order.items) {
          await tx.inventoryStock.upsert({
            where: {
              productId_locationId: { productId: item.productId, locationId: order.locationId },
            },
            update: { quantity: { decrement: item.quantity } },
            create: { productId: item.productId, locationId: order.locationId, quantity: -item.quantity },
          });

          await recordStockMovement(tx, {
            productId: item.productId,
            locationId: order.locationId,
            type: "sale",
            quantityChange: -item.quantity,
            referenceType: "Order",
            referenceId: order.localOrderId,
            note: "بيع من نقطة البيع",
            createdById: order.userId,
          });
        }

        await tx.shift.update({
          where: { id: order.shiftId },
          data: {
            totalCash: { increment: order.cashAmount },
            totalCard: { increment: order.cardAmount },
          },
        });
      });

      results.push({ localOrderId: order.localOrderId, status: "synced" });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // تعارض فريد (سباق مزامنة من أكثر من جهاز لنفس الفاتورة) = متزامنة أصلاً
        results.push({ localOrderId: order.localOrderId, status: "already_synced" });
      } else {
        console.error(`فشل مزامنة الفاتورة ${order.localOrderId}:`, error);
        results.push({
          localOrderId: order.localOrderId,
          status: "failed",
          error: "حدث خطأ أثناء مزامنة الفاتورة مع السيرفر",
        });
      }
    }
  }

  revalidatePath("/inventory");

  return { results };
}
